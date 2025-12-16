import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";

export async function GET(request: Request) {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
  if (!auth.ok) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
  const session = auth.session;

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") || "all";
  const committeeId = searchParams.get("committee_id");

  let query = supabase.from("users").select("id");

  if (role !== "all") {
    query = query.eq("role", role);
  }

  if (committeeId) {
    // If filtering by committee, we need to join committee_members
    // Supabase JS inner join syntax
    const { data, error } = await supabase
        .from("committee_members")
        .select("user_id")
        .eq("committee_id", committeeId);
    
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    
    const ids = data.map(r => r.user_id);
    return NextResponse.json(ids);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  const ids = data.map(u => u.id);
  return NextResponse.json(ids);
}