import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "superadmin" && session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { committee_id, session_name } = await request.json();
    const uniqueToken = uuidv4();

    const { data, error } = await supabase
      .from("roll_calls")
      .insert({
        committee_id, // now expecting UUID string
        session_name,
        qr_code: uniqueToken
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Roll call error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}