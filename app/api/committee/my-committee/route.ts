import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "committee_chairman") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Find the committee this user admins (UUID check)
  const { data: committee, error } = await supabase
    .from("committees")
    .select("id, name")
    .eq("admin_id", session.user.id)
    .single();

  if (error || !committee) {
    console.error("Committee not found for admin:", session.user.id, error);
    return NextResponse.json({ error: "Committee not found" }, { status: 404 });
  }

  // 2. Fetch members of this committee
  // Explicitly selecting fields from the joined table
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
    .eq("committee_id", committee.id);

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
// - Added error logging for debugging.
// - Updated Supabase select query to use explicit syntax for joined table fields.
// - Added robust mapping logic to handle `m.user` being either an object or an array (Supabase quirk).
// - Added fallback values for missing user data to prevent frontend crashes.