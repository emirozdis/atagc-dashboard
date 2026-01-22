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

  // Strictly enforce Approved status.
  const auth = await getAuthorization({ 
      requireAuth: true, 
      allowedRoles: ["committee_chairman", "deputy_chair", "applicant"], // Applicant filtered below
      requireApproved: true 
  });
  
  if (!auth.ok || !auth.session) {
    return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
  }
  
  const session = auth.session;

  // Block basic applicants/delegates from this management endpoint
  if (session.user.role === 'applicant' || session.user.role === 'delegate' || session.user.role === 'press' || session.user.role === 'observer') {
      return NextResponse.json({ error: "Forbidden: Management access only" }, { status: 403 });
  }

  let committeeId: string | null = null;

  // 1. Check if user is a Chairman
  const { data: adminCommittee } = await supabase
    .from("committees")
    .select("id")
    .eq("admin_id", session.user.id)
    .maybeSingle();
    
  if (adminCommittee) {
    committeeId = adminCommittee.id;
  } else {
    // 2. Check if user is a Deputy Chair
    const { data: memberCommittee } = await supabase
      .from("committee_members")
      .select("committee_id")
      .eq("user_id", session.user.id)
      .maybeSingle();
      
    if (memberCommittee) {
      committeeId = memberCommittee.committee_id;
    }
  }

  if (!committeeId) {
    return NextResponse.json({ error: "Committee not found" }, { status: 404 });
  }

  // Parallel data fetching
  const [committeeRes, membersRes, lastRollCallRes, topicRes, recentRollCallsRes] = await Promise.all([
    supabase.from("committees").select("id, name, description").eq("id", committeeId).maybeSingle(), 
    
    supabase.from("committee_members").select(`
          id, can_write,
          user:users (
            id, full_name, email, role,
            user_details ( profile_picture_url, is_profile_picture_hidden )
          )
        `).eq("committee_id", committeeId),
    
    supabase.from("roll_calls").select("id, session_name, created_at, roll_call_logs(count)")
      .eq("committee_id", committeeId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    
    supabase.from("topics").select("title, description").eq("committee_id", committeeId).limit(1).maybeSingle(),
    
    supabase.from("roll_calls").select("id, session_name, created_at")
      .eq("committee_id", committeeId).order("created_at", { ascending: false }).limit(5)
  ]);

  if (committeeRes.error || !committeeRes.data) {
    return NextResponse.json({ error: "Failed to fetch committee details" }, { status: 500 });
  }

  // --- Image Optimization Logic ---
  const members = membersRes.data || [];
  const pathsToSign: string[] = [];

  const formattedMembers = members.map((m: any) => {
    const u = Array.isArray(m.user) ? m.user[0] : m.user;
    const details = u?.user_details ? (Array.isArray(u.user_details) ? u.user_details[0] : u.user_details) : null;

    const isSelf = u.id === session.user.id;
    const isHidden = details?.is_profile_picture_hidden;
    let imagePath = null;

    if (details?.profile_picture_url) {
        // Chairmen/Deputies can generally see members unless explicitly hidden, 
        // but let's respect privacy settings for consistency unless it's self.
        if (isSelf || !isHidden) {
            imagePath = details.profile_picture_url;
            if (imagePath && !imagePath.startsWith('http')) {
                pathsToSign.push(imagePath);
            }
        }
    }

    return {
      id: m.id,
      userId: u.id,
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      can_edit: m.can_write,
      image: imagePath 
    };
  });

  // Batch Sign
  if (pathsToSign.length > 0) {
      const signedData = await getSignedUrls("profile-pictures", pathsToSign);
      // Map signed URLs back to members
      const urlMap = new Map();
      signedData?.forEach(item => urlMap.set(item.path, item.signedUrl));

      formattedMembers.forEach(m => {
          if (m.image && urlMap.has(m.image)) m.image = urlMap.get(m.image);
      });
  }

  const totalMembers = formattedMembers.length;
  const lastRollCall = lastRollCallRes.data ? {
    session_name: lastRollCallRes.data.session_name,
    date: lastRollCallRes.data.created_at,
    attendance_count: lastRollCallRes.data.roll_call_logs?.[0]?.count || 0,
    attendance_rate: totalMembers > 0 ? Math.round(((lastRollCallRes.data.roll_call_logs?.[0]?.count || 0) / totalMembers) * 100) : 0
  } : null;

  return NextResponse.json({
    ...committeeRes.data,
    topic: topicRes.data,
    members: formattedMembers,
    roll_calls: recentRollCallsRes.data || [],
    stats: {
      total_members: totalMembers,
      last_roll_call: lastRollCall
    }
  });
}

// Change Log:
// - Implemented batch image signing for managers as well.
// - Ensures profile pictures are available on the Chairman's dashboard.