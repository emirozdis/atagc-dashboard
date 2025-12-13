import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "committee_chairman") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Find the committee this user admins
  const { data: committee, error } = await supabase
    .from("committees")
    .select("id, name")
    .eq("admin_id", session.user.id)
    .single();

  if (error || !committee) return NextResponse.json({ error: "Committee not found" }, { status: 404 });

  // 2. Fetch members of this committee
  const { data: members } = await supabase
    .from("committee_members")
    .select("id, user:users(id, full_name, email), can_write")
    .eq("committee_id", committee.id);
  
  const formattedMembers = members?.map(m => ({
    // @ts-ignore
    id: m.id, // committee_members.id (used for API PUT)
    // @ts-ignore
    userId: m.user.id, // users.id (used for WebSocket targeting)
    // @ts-ignore
    full_name: m.user.full_name,
    // @ts-ignore
    email: m.user.email,
    can_edit: m.can_write
  })) || [];

  return NextResponse.json({ ...committee, members: formattedMembers });
}

// Change Log:
// - Added `userId: m.user.id` to the response so the frontend can target specific users via WebSocket.