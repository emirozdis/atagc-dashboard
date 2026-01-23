import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";

export const GET = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
  if (!auth.ok) throw new Error("Unauthorized");

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";
  const committeeId = searchParams.get("committee_id") || "all";
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");
  const sortBy = searchParams.get("sort_by") || "created_at";
  const sortOrder = searchParams.get("sort_order") || "desc";

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("roll_calls")
    .select(`
      id,
      session_name,
      created_at,
      committee:committees ( 
        id,
        name,
        committee_members:committee_members(count)
      ),
      roll_call_logs:roll_call_logs(count)
    `, { count: 'exact' });

  if (search) {
    query = query.ilike("session_name", `%${search}%`);
  }

  if (committeeId !== "all") {
    query = query.eq("committee_id", committeeId);
  }

  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    query = query.gte("created_at", start.toISOString());
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    query = query.lte("created_at", end.toISOString());
  }

  const { data, error, count } = await query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(from, to);

  if (error) {
    console.error("Fetch roll calls error:", error);
    throw error;
  }

  if (data) {
    const nullCommittees = data.filter(r => !r.committee);
    if (nullCommittees.length > 0) {
      console.warn(`[Admin RollCalls] Found ${nullCommittees.length} roll calls with null committee.`);
    }
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
});