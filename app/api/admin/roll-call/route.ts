import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
  if (!auth.ok) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
  const session = auth.session;

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