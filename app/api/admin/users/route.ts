import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";
import { logAction } from "@/lib/logger";

interface UserParams {
  page: number;
  limit: number;
  search: string;
  role?: string[];
  status?: string[];
  paymentStatus?: string[];
  warnings?: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

async function getUsersByIds(ids: string[]) {
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, role")
    .in("id", ids);

  if (error) throw error;
  return data;
}

async function getFilteredUsers(params: UserParams) {
  const { page, limit, search, role, status, paymentStatus, warnings, sortBy, sortOrder } = params;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const selectFields = [
    "id, full_name, email, role, is_suspended, created_at",
    "user_details(profile_picture_url)",
    "warnings_count:user_warnings!user_warnings_user_id_fkey(count)",
    "payment_receipts!payment_receipts_user_id_fkey(id)" // FK hint to avoid ambiguity
  ];

  if (paymentStatus && paymentStatus.length > 0) {
    selectFields.push("application:applications!inner(status, payment_status)");
  } else {
    selectFields.push("application:applications(status, payment_status)");
  }

  if (warnings === "has_warnings") {
    selectFields.push("user_warnings!user_warnings_user_id_fkey!inner(id)");
  }

  // 2. Build Query
  let query = supabase.from("users").select(selectFields.join(","), { count: 'exact' });

  // 3. Apply Filters
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  if (role && role.length > 0) {
    query = query.in("role", role);
  }

  if (status && status.length > 0) {
    if (status.includes("suspended") && !status.includes("active")) query = query.eq("is_suspended", true);
    else if (status.includes("active") && !status.includes("suspended")) query = query.eq("is_suspended", false);
  }

  if (paymentStatus && paymentStatus.length > 0) {
    query = query.in("application.payment_status", paymentStatus);
  }

  // 4. Sorting (Database Level)
  // Note: 'warnings_count' sorting happens in memory below because PostgREST doesn't support sorting by computed aggregates easily
  if (sortBy !== 'warnings_count') {
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  } else {
    // Default sort for pagination stability before re-sorting in memory
    query = query.order('created_at', { ascending: false });
  }

  // 5. Pagination
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  // 6. Post-Processing & Formatting
  let processedData = (data || []).map((u: any) => ({
    ...u,
    warnings_count: u.warnings_count?.[0]?.count || 0
  }));

  // In-memory sort for aggregates
  if (sortBy === 'warnings_count') {
    processedData.sort((a: any, b: any) => {
      return sortOrder === 'asc' 
        ? a.warnings_count - b.warnings_count 
        : b.warnings_count - a.warnings_count;
    });
  }

  return {
    data: processedData,
    meta: {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    }
  };
}


export const GET = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ 
    requireAuth: true, 
    allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.DEPUTY_CHAIR] 
  });
  if (!auth.ok) throw new Error(auth.message);

  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids");

  if (ids) {
    const data = await getUsersByIds(ids.split(","));
    return NextResponse.json({ data });
  }
  
  const params: UserParams = {
    page: parseInt(searchParams.get("page") || "1"),
    limit: parseInt(searchParams.get("limit") || "10"),
    search: searchParams.get("search") || "",
    role: searchParams.get("role")?.split(",").filter(Boolean),
    status: searchParams.get("status")?.split(",").filter(Boolean),
    paymentStatus: searchParams.get("payment_status")?.split(",").filter(Boolean),
    warnings: searchParams.get("warnings") || "all",
    sortBy: searchParams.get("sort_by") || "created_at",
    sortOrder: (searchParams.get("sort_order") as "asc" | "desc") || "desc",
  };

  const result = await getFilteredUsers(params);
  return NextResponse.json(result);
});

export const PUT = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ 
    requireAuth: true, 
    allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] 
  });
  if (!auth.ok || !auth.session) throw new Error(auth.message);
  const adminId = auth.session.user.id;

  const body = await request.json();

  // Batch Update Role
  if (body.ids && body.role) {
    const { error } = await supabase.from("users").update({ role: body.role }).in("id", body.ids);
    if (error) throw error;
    await logAction(adminId, "batch_update_role", { ids: body.ids, new_role: body.role }, request);
    return NextResponse.json({ success: true });
  }

  // Action: Single User Update
  if (body.id) {
    // Role Update
    if (body.role) {
      const { error } = await supabase.from("users").update({ role: body.role }).eq("id", body.id);
      if (error) throw error;
      await logAction(adminId, "update_role", { target_id: body.id, new_role: body.role }, request);
    }
    
    // Suspend Toggle
    if (typeof body.is_suspended === 'boolean') {
      const { error } = await supabase.from("users").update({ is_suspended: body.is_suspended }).eq("id", body.id);
      if (error) throw error;
      await logAction(adminId, "toggle_suspend", { target_id: body.id, suspended: body.is_suspended }, request);
    }

    return NextResponse.json({ success: true });
  }

  throw new Error("Invalid request payload");
});

export const DELETE = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: [ROLES.SUPERADMIN] });
  if (!auth.ok || !auth.session) throw new Error(auth.message);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) throw new Error("Missing ID");

  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) throw error;

  await logAction(auth.session.user.id, "delete_user", { target_id: id }, request);

  return NextResponse.json({ success: true });
});