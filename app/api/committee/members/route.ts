import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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