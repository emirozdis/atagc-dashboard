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
  const userId = searchParams.get("userId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

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

  // Filter by Action Type
  if (action !== "all") {
    query = query.ilike("action", `%${action}%`);
  }

  // Filter by Specific User ID
  if (userId) {
    query = query.eq("user_id", userId);
  }

  // Filter by Date Range
  if (startDate) {
    query = query.gte("created_at", startDate);
  }
  if (endDate) {
    // Add one day to include the end date fully (or handle time component)
    // Assuming YYYY-MM-DD string
    query = query.lte("created_at", `${endDate}T23:59:59`);
  }

  // Generic Search (IP or User Name/Email)
  if (search) {
    // Note: Cross-table OR filters with Supabase client are tricky.
    // We prioritize searching logs columns (IP, Action) and potentially user info via relationship if supported syntax.
    // For simplicity and performance, we stick to searching IP in logs or simple action matching if not handled above.
    // Searching foreign table fields in OR is supported in newer PostgREST/Supabase versions:
    query = query.or(`ip_address.ilike.%${search}%,user.full_name.ilike.%${search}%,user.email.ilike.%${search}%`, { foreignTable: 'user' });
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

// Change Log:
// - Added handling for `userId`, `startDate`, and `endDate` parameters in the Supabase query.