import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { logAction } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

// Read: 60/min, Write: 20/min
const readLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });
const writeLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 200 });

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  try {
    await readLimiter.check(60, ip);
  } catch {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  const auth = await getAuthorization({
    requireAuth: true,
    customCheck: async (session) => {
      const { data: committeeMember, error: cmError } = await supabase
        .from("committee_members")
        .select(`
          committee:committees (
            id,
            name,
            admin_id
          )
        `)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (cmError && cmError.code !== 'PGRST116') {
        console.error("Fetch committee error:", cmError);
        return { ok: false, status: 500, message: "Database error" };
      }

      if (!committeeMember?.committee) {
        return { ok: false, status: 404, message: "Committee not found" };
      }

      return { ok: true, payload: { committeeMember } };
    },
  });

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const committeeMember = auth.payload.committeeMember;

    // @ts-ignore
    const committeeId = committeeMember.committee.id;
    // @ts-ignore
    const adminId = committeeMember.committee.admin_id;

    // Fetch admin information
    let admin = null;
    if (adminId) {
      const { data: adminData, error: adminError } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("id", adminId)
        .single();

      if (!adminError && adminData) {
        admin = {
          id: adminData.id,
          full_name: adminData.full_name || "İsimsiz Yönetici",
          email: adminData.email || "",
        };
      }
    }

    // Fetch all committee members
    const { data: members, error: membersError } = await supabase
      .from("committee_members")
      .select(`
        id,
        can_write,
        user:users (
          id,
          full_name,
          email,
          role
        )
      `)
      .eq("committee_id", committeeId);

    if (membersError) {
      console.error("Error fetching committee members:", membersError);
      return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
    }

    const formattedMembers = members?.map((m: any) => {
      const userData = Array.isArray(m.user) ? m.user[0] : m.user;
      
      return {
        id: m.id,
        userId: userData?.id,
        full_name: userData?.full_name || "İsimsiz Üye",
        email: userData?.email || "",
        role: userData?.role || "applicant",
        can_edit: m.can_write
      };
    }) || [];

    return NextResponse.json({
      admin,
      members: formattedMembers
    });

  } catch (error) {
    console.error("Committee members API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  try {
    await writeLimiter.check(20, ip);
  } catch {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  // Only committee chairmen can update members
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: "committee_chairman" });
  if (!auth.ok || !auth.session) {
    return NextResponse.json({ error: auth.message || "Unauthorized" }, { status: auth.status || 401 });
  }
  const session = auth.session;

  const { memberId, canEdit } = await request.json();

  // Fetch previous state
  const { data: previousState } = await supabase
    .from("committee_members")
    .select("can_write")
    .eq("id", memberId)
    .single();

  // Update 'can_write' column based on the request (UUID memberId)
  const { error } = await supabase
    .from("committee_members")
    .update({ can_write: canEdit })
    .eq("id", memberId);

  if (error) {
    console.error("Update member error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  await logAction(session.user.id, "update_member_permission", { 
      member_id: memberId, 
      can_write: canEdit,
      previous_state: previousState
  }, request);

  return NextResponse.json({ success: true });
}

// Change Log:
// - Added rate limiting: GET (60/min), PUT (20/min).