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

  // Filter by Date Range (Robust timestamptz handling)
  if (startDate) {
    // Ensure we compare from the start of the day
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    query = query.gte("created_at", start.toISOString());
  }
  if (endDate) {
    // Ensure we compare until the very end of the day
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    query = query.lte("created_at", end.toISOString());
  }

  // Generic Search
  if (search) {
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
// - Updated Date Range logic to use `Date` objects and `toISOString()` for precise `timestamptz` comparison.
// - Ensures `startDate` starts at 00:00:00 and `endDate` covers up to 23:59:59.999.