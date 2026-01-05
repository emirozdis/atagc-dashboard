import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { rateLimit } from "@/lib/rate-limit";

// Limit: 60 requests per minute
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  try {
    await limiter.check(60, ip);
  } catch {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  const auth = await getAuthorization({ requireAuth: true, allowedRoles: "committee_chairman" });
  if (!auth.ok || !auth.session) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
  const session = auth.session;

  let committeeId: string | null = null;

  // 1. Try to find committee by admin_id
  const { data: adminCommittee } = await supabase
    .from("committees")
    .select("id, name, description")
    .eq("admin_id", session.user.id)
    .maybeSingle();

  if (adminCommittee) {
    committeeId = adminCommittee.id;
  } else {
    // 2. Fallback: Try to find committee by membership
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
    console.error("Committee not found for chairman:", session.user.id);
    return NextResponse.json({ error: "Committee not found" }, { status: 404 });
  }

  // Fetch committee details, members, and stats in parallel
  const [committeeRes, membersRes, lastRollCallRes] = await Promise.all([
    supabase
        .from("committees")
        .select("id, name, description")
        .eq("id", committeeId)
        .single(),
    supabase
        .from("committee_members")
        .select(`
          id,
          can_write,
          user:users (
            id,
            full_name,
            email
          )
        `)
        .eq("committee_id", committeeId),
    supabase
        .from("roll_calls")
        .select(`
            id, 
            session_name, 
            created_at, 
            roll_call_logs(count)
        `)
        .eq("committee_id", committeeId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
  ]);

  if (committeeRes.error) {
     return NextResponse.json({ error: "Failed to fetch committee details" }, { status: 500 });
  }

  const members = membersRes.data || [];
  const formattedMembers = members.map((m: any) => {
    const userData = Array.isArray(m.user) ? m.user[0] : m.user;
    return {
      id: m.id, 
      userId: userData?.id, 
      full_name: userData?.full_name || "İsimsiz Üye",
      email: userData?.email || "",
      can_edit: m.can_write
    };
  });

  // Calculate Stats
  const totalMembers = formattedMembers.length;
  const lastRollCall = lastRollCallRes.data ? {
      session_name: lastRollCallRes.data.session_name,
      date: lastRollCallRes.data.created_at,
      attendance_count: lastRollCallRes.data.roll_call_logs?.[0]?.count || 0,
      attendance_rate: totalMembers > 0 
        ? Math.round(((lastRollCallRes.data.roll_call_logs?.[0]?.count || 0) / totalMembers) * 100) 
        : 0
  } : null;

  return NextResponse.json({ 
      ...committeeRes.data, 
      members: formattedMembers,
      stats: {
          total_members: totalMembers,
          last_roll_call: lastRollCall
      }
  });
}

// Change Log:
// - Added logic to fetch `last_roll_call` stats and `total_members`.
// - Returns a combined object with a `stats` field for the chairman dashboard.