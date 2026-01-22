import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { rateLimit } from "@/lib/rate-limit";
import { getSignedUrls } from "@/lib/storage-utils";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  try {
    await limiter.check(60, ip);
  } catch {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  // 1. Auth Check
  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const session = auth.session;
  const currentUserId = session.user.id;

  // 2. Determine User's Committee
  // Try member first
  const { data: membership } = await supabase
    .from("committee_members")
    .select("committee_id")
    .eq("user_id", currentUserId)
    .maybeSingle();

  let committeeId = membership?.committee_id;

  // If not member, try admin (chairman)
  if (!committeeId) {
    const { data: managed } = await supabase
      .from("committees")
      .select("id")
      .eq("admin_id", currentUserId)
      .maybeSingle();
    committeeId = managed?.id;
  }

  if (!committeeId) {
    return NextResponse.json({ error: "No committee found" }, { status: 404 });
  }

  // 3. Fetch Committee Admin & Members
  const [adminRes, membersRes] = await Promise.all([
    supabase
      .from("committees")
      .select(`
        admin:users!committees_admin_id_fkey (
          id, full_name, email, role,
          user_details ( profile_picture_url, is_profile_picture_hidden )
        )
      `)
      .eq("id", committeeId)
      .single(),
    
    supabase
      .from("committee_members")
      .select(`
        id,
        can_write,
        user:users (
          id, full_name, email, role,
          user_details ( profile_picture_url, is_profile_picture_hidden )
        )
      `)
      .eq("committee_id", committeeId)
  ]);

  // 4. Process Images with Batch Signing
  const pathsToSign: string[] = [];
  const memberMap = new Map(); // Store processed objects to attach URLs later

  // Helper to process a user object
  const processUser = (u: any, isChairman = false, memberId?: string, canWrite = false) => {
    if (!u) return null;
    
    const details = Array.isArray(u.user_details) ? u.user_details[0] : u.user_details;
    const isSelf = u.id === currentUserId;
    const isHidden = details?.is_profile_picture_hidden;
    const isSuperAdmin = session.user.role === 'superadmin';
    
    let imagePath = null;

    // Privacy Logic: Show if Self OR Superadmin OR (Not Hidden)
    if (details?.profile_picture_url) {
      if (isSelf || isSuperAdmin || !isHidden) {
        imagePath = details.profile_picture_url;
        if (imagePath && !imagePath.startsWith('http')) {
          pathsToSign.push(imagePath);
        }
      }
    }

    const obj = {
      id: memberId || `chair-${u.id}`, // Unique ID for UI keys
      userId: u.id,
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      can_edit: canWrite,
      image: imagePath // Will be replaced by signed URL
    };

    memberMap.set(u.id, obj);
    return obj;
  };

  // Process Admin
  let adminObj = null;
  if (adminRes.data?.admin) {
    adminObj = processUser(adminRes.data.admin, true);
  }

  // Process Members
  const membersList = (membersRes.data || []).map((m: any) => {
    const u = Array.isArray(m.user) ? m.user[0] : m.user;
    return processUser(u, false, m.id, m.can_write);
  }).filter(Boolean); // Filter out nulls if any

  // 5. Execute Batch Signing
  if (pathsToSign.length > 0) {
    // Deduplicate paths
    const uniquePaths = Array.from(new Set(pathsToSign));
    const signedData = await getSignedUrls("profile-pictures", uniquePaths);
    
    // Create lookup map
    const urlMap = new Map();
    signedData?.forEach(item => urlMap.set(item.path, item.signedUrl));

    // Update Admin Object
    if (adminObj && adminObj.image && urlMap.has(adminObj.image)) {
      adminObj.image = urlMap.get(adminObj.image);
    }

    // Update Members
    membersList.forEach((m: any) => {
      if (m.image && urlMap.has(m.image)) {
        m.image = urlMap.get(m.image);
      }
    });
  }

  return NextResponse.json({
    admin: adminObj,
    members: membersList
  });
}

// Change Log:
// - Created optimized endpoint specifically for fetching roster.
// - Uses `getSignedUrls` to sign all profile pictures in ONE batch request.
// - Respects privacy settings (`is_profile_picture_hidden`).