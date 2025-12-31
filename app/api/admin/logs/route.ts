import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";

export async function GET(request: Request) {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
  if (!auth.ok) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const action = searchParams.get("action") || "all";

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("logs")
    .select(`
      id,
      action,
      details,
      ip_address,
      user_agent,
      created_at,
      user:users (
        full_name,
        email,
        role
      )
    `, { count: "exact" })
    .order("created_at", { ascending: false });

  if (action !== "all") {
    query = query.ilike("action", `%${action}%`);
  }

  if (search) {
    // Search in user name/email or IP
    // Note: Searching joined tables needs specific filter syntax or separate search
    // Supabase allows simple OR filters across columns
    query = query.or(`ip_address.ilike.%${search}%,user.full_name.ilike.%${search}%,user.email.ilike.%${search}%`, { foreignTable: "user" });
    // Since we can't easily do OR across parent/child in one go cleanly without join, 
    // a common pattern is to search logs columns OR search users and filter by user_id.
    // For simplicity with Supabase JS client limitation on mixed table ORs:
    // We'll stick to searching IP in logs table OR we rely on the PostgREST syntax if supported.
    // Actually, referencing foreign table columns in .or() like above `user.full_name` is valid in recent supabase-js versions.
  }

  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Fetch logs error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    meta: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    }
  });
}