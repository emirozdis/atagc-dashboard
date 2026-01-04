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
    .select("id, name")
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

  // Fetch committee details using the found ID
  const { data: committee, error: commError } = await supabase
    .from("committees")
    .select("id, name")
    .eq("id", committeeId)
    .single();
    
  if (commError) {
     return NextResponse.json({ error: "Failed to fetch committee details" }, { status: 500 });
  }

  // 3. Fetch members of this committee
  const { data: members, error: membersError } = await supabase
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
    .eq("committee_id", committeeId);

  if (membersError) {
    console.error("Error fetching committee members:", membersError);
  }
  
  const formattedMembers = members?.map((m: any) => {
    // Handle potential array return from Supabase for one-to-many inference
    const userData = Array.isArray(m.user) ? m.user[0] : m.user;
    
    return {
      id: m.id, // UUID string of the membership record
      userId: userData?.id, // UUID string of the user
      full_name: userData?.full_name || "İsimsiz Üye",
      email: userData?.email || "",
      can_edit: m.can_write
    };
  }) || [];

  return NextResponse.json({ ...committee, members: formattedMembers });
}

// Change Log:
// - Added rate limiting (60/min).