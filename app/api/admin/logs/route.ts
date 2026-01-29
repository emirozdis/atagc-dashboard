import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

export const GET = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ 
    requireAuth: true, 
    allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] 
  });
  if (!auth.ok) throw new Error(auth.message);

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  
  // Filters
  const action = searchParams.get("action") || "all";
  const severity = searchParams.get("severity") || "all";
  const category = searchParams.get("category") || "all";
  
  const userId = searchParams.get("userId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  // Sorting
  const sortBy = searchParams.get("sort_by") || "created_at";
  const sortOrder = searchParams.get("sort_order") || "desc";

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("logs")
    .select(`
      id,
      action,
      details,
      severity,
      category,
      resource_id,
      resource_type,
      ip_address,
      user_agent,
      created_at,
      user:users (
        full_name,
        email,
        role
      )
    `, { count: "exact" });

  if (action !== "all" && action.trim() !== "") {
    query = query.ilike("action", `%${action}%`);
  }

  if (severity !== "all" && severity.trim() !== "") {
    const severities = severity.split(",").filter(Boolean);
    if (severities.length > 0) {
      query = query.in("severity", severities);
    }
  }

  if (category !== "all" && category.trim() !== "") {
    const categories = category.split(",").filter(Boolean);
    if (categories.length > 0) {
      query = query.in("category", categories);
    }
  }

  if (userId) {
    query = query.eq("user_id", userId);
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

  if (search) {
    query = query.or(`ip_address.ilike.%${search}%,user.full_name.ilike.%${search}%,user.email.ilike.%${search}%`, { foreignTable: 'user' });
  }

  // Sorting
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Pagination
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

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