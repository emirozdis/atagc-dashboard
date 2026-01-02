import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["committee_chairman", "superadmin"] });
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  
  try {
    const body = await request.json();
    const status = body.status;

    if (!status || (status !== 'open' && status !== 'closed')) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { error } = await supabase
      .from("votes")
      .update({ status })
      .eq("id", id);

    if (error) {
        console.error("Vote update error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("API error:", e);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}