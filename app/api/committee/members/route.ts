import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // First, get the user's committee
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
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!committeeMember?.committee) {
      return NextResponse.json({ error: "Committee not found" }, { status: 404 });
    }

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
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "committee_chairman") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { memberId, canEdit } = await request.json();

  // Update 'can_write' column based on the request (UUID memberId)
  const { error } = await supabase
    .from("committee_members")
    .update({ can_write: canEdit })
    .eq("id", memberId);

  if (error) {
    console.error("Update member error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
