import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "superadmin" && session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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