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

  // Allowed roles for management view: Chairman and Co-Chair
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["committee_chairman", "deputy_chair"] });
  if (!auth.ok || !auth.session) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
  const session = auth.session;

  let committeeId: string | null = null;

  // ... (Committee ID Finding Logic remains same) ...
  const { data: adminCommittee } = await supabase.from("committees").select("id, name, description").eq("admin_id", session.user.id).maybeSingle();
  if (adminCommittee) committeeId = adminCommittee.id;
  else {
    const { data: memberCommittee } = await supabase.from("committee_members").select("committee_id").eq("user_id", session.user.id).maybeSingle();
    if (memberCommittee) committeeId = memberCommittee.committee_id;
  }

  if (!committeeId) return NextResponse.json({ error: "Committee not found" }, { status: 404 });

  const [committeeRes, membersRes, lastRollCallRes, topicRes, recentRollCallsRes] = await Promise.all([
    supabase.from("committees").select("id, name, description").eq("id", committeeId).maybeSingle(), 
    supabase.from("committee_members").select(`
          id,
          can_write,
          user:users (
            id,
            full_name,
            email,
            role,
            user_details ( profile_picture_url, is_profile_picture_hidden )
          )
        `).eq("committee_id", committeeId),
    supabase.from("roll_calls").select("id, session_name, created_at, roll_call_logs(count)").eq("committee_id", committeeId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("topics").select("title, description").eq("committee_id", committeeId).limit(1).maybeSingle(),
    supabase.from("roll_calls").select("id, session_name, created_at").eq("committee_id", committeeId).order("created_at", { ascending: false }).limit(5)
  ]);

  if (committeeRes.error || !committeeRes.data) {
    return NextResponse.json({ error: "Failed to fetch committee details" }, { status: 500 });
  }

  const members = membersRes.data || [];
  const pathsToSign: string[] = [];

  const formattedMembers = members.map((m: any) => {
    const userData = Array.isArray(m.user) ? m.user[0] : m.user;
    const details = userData?.user_details ? (Array.isArray(userData.user_details) ? userData.user_details[0] : userData.user_details) : null;

    // As Chairman/Deputy, I can see everyone's picture even if hidden?
    // User requirement: "hide from everyone except the superadmins".
    // So Chairs CANNOT see hidden pictures.
    const isSelf = userData.id === session.user.id;
    const isHidden = details?.is_profile_picture_hidden;
    let imagePath = null;

    if (details?.profile_picture_url) {
        if (isSelf || !isHidden) {
            imagePath = details.profile_picture_url;
            if (imagePath && !imagePath.startsWith('http')) {
                pathsToSign.push(imagePath);
            }
        }
    }

    return {
      id: m.id,
      userId: userData?.id,
      full_name: userData?.full_name || "İsimsiz Üye",
      email: userData?.email || "",
      role: userData?.role || "applicant",
      can_edit: m.can_write,
      image: imagePath 
    };
  });

  if (pathsToSign.length > 0) {
      const signedData = await getSignedUrls("profile-pictures", pathsToSign);
      signedData?.forEach(item => {
          formattedMembers.forEach(m => {
              if (m.image === item.path) m.image = item.signedUrl;
          });
      });
  }

  // ... (Rest of logic: totalMembers, lastRollCall) ...
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
// - Implemented privacy logic: Chairs cannot see hidden pictures (only self or non-hidden).
// - Implemented signed URLs.