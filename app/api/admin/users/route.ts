import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { logAction } from "@/lib/logger";
import { apiHandler } from "@/lib/api-handler";
import { canManageRole } from "@/lib/permissions";
import { sendSystemNotification } from "@/lib/notification-service";

export const GET = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin", "committee_chairman"] });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";
  const role = searchParams.get("role") || "";
  const status = searchParams.get("status") || "";
  const warningFilter = searchParams.get("warnings") || "all";
  const sortBy = searchParams.get("sort_by") || "created_at";
  const sortOrder = searchParams.get("sort_order") || "desc";
  const idsParam = searchParams.get("ids");
  const paymentStatus = searchParams.get("payment_status") || "";

  if (idsParam) {
    const ids = idsParam.split(",").filter(Boolean);
    if (ids.length === 0) return NextResponse.json({ data: [] });

    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, email, role, is_suspended, user_details(profile_picture_url)")
      .in("id", ids);

    if (error) throw error;
    return NextResponse.json({ data });
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const selectString = warningFilter === "has_warnings" 
    ? `
      id, 
      full_name, 
      email, 
      role, 
      is_suspended, 
      created_at, 
      user_details(school_name, phone_number, birth_date, additional_info, profile_picture_url),
      committee_members(committee:committees(id, name)),
      application:applications(id, status, payment_status),
      user_warnings:user_warnings!user_warnings_user_id_fkey!inner(id),
      payment_receipts:payment_receipts!payment_receipts_user_id_fkey(id)
    `
    : `
      id, 
      full_name, 
      email, 
      role, 
      is_suspended, 
      created_at, 
      user_details(school_name, phone_number, birth_date, additional_info, profile_picture_url),
      committee_members(committee:committees(id, name)),
      application:applications(id, status, payment_status),
      user_warnings:user_warnings!user_warnings_user_id_fkey(id),
      payment_receipts:payment_receipts!payment_receipts_user_id_fkey(id)
    `;

  let query = supabase.from("users").select(selectString, { count: "exact" });

  if (role) query = query.in("role", role.split(','));
  
  if (status) {
    const statuses = status.split(',');
    const booleanStatuses = [];
    if (statuses.includes('active')) booleanStatuses.push(false);
    if (statuses.includes('suspended')) booleanStatuses.push(true);
    if (booleanStatuses.length > 0) {
      query = query.in('is_suspended', booleanStatuses);
    }
  }

  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

  if (paymentStatus) {
      const statuses = paymentStatus.split(',');
      const { data: usersWithStatus } = await supabase.from('applications').select('user_id').in('payment_status', statuses);
      const userIds = usersWithStatus?.map(u => u.user_id) || [];
      
      if (userIds.length > 0) {
          query = query.in('id', userIds);
      } else {
          // If no users match, return empty result without hitting the main query again
          return NextResponse.json({ data: [], meta: { total: 0, page, limit, totalPages: 0 }});
      }
  }

  if (sortBy === "created_at" || sortBy === "full_name") {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  }

  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  const transformedData = data.map((user: any) => ({
      ...user,
      warnings_count: user.user_warnings?.length || 0,
      user_warnings: undefined,
      payment_receipts: user.payment_receipts?.length > 0 ? [user.payment_receipts[user.payment_receipts.length - 1]] : []
  }));

  if (sortBy === "warnings_count") {
      transformedData.sort((a: any, b: any) => {
          return sortOrder === 'asc' 
            ? a.warnings_count - b.warnings_count 
            : b.warnings_count - a.warnings_count;
      });
  }

  return NextResponse.json({
    data: transformedData,
    meta: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    }
  });
});

export const PUT = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const session = auth.session;

  const body = await request.json();
  const { id, ids, role, is_suspended } = body;

  if (id) {
    if (session.user.id === id) return NextResponse.json({ error: "Cannot modify own account" }, { status: 400 });
    const { data: targetUser } = await supabase.from("users").select("role, is_suspended").eq("id", id).single();
    if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!canManageRole(session.user.role, targetUser.role)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    if (role && !canManageRole(session.user.role, role)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

    const updates: any = {};
    if (role !== undefined) updates.role = role;
    if (is_suspended !== undefined) {
        updates.is_suspended = is_suspended;
        if (is_suspended === true) {
            await supabase.from("active_sessions").delete().eq("user_id", id);
        }
    }

    const { error } = await supabase.from("users").update(updates).eq("id", id);
    if (error) throw error;
    
    await logAction(session.user.id, "update_user", { target_user_id: id, updates, previous_state: targetUser }, request);

    if (is_suspended === true && !targetUser.is_suspended) {
        await sendSystemNotification(id, "account_suspended");
    }

    return NextResponse.json({ success: true });
  }

  if (ids && Array.isArray(ids)) {
    if (role && !canManageRole(session.user.role, role)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    const updates: any = {};
    if (role !== undefined) updates.role = role;
    const { error } = await supabase.from("users").update(updates).in("id", ids).neq("id", session.user.id);
    if (error) throw error;
    await logAction(session.user.id, "batch_update_users", { target_ids: ids, updates }, request);
    return NextResponse.json({ success: true, count: ids.length });
  }
  return NextResponse.json({ error: "Invalid Request" }, { status: 400 });
});

export const DELETE = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const session = auth.session;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  if (session.user.id === id) return NextResponse.json({ error: "Cannot delete self" }, { status: 400 });

  const { data: targetUser } = await supabase.from("users").select("id, email, role").eq("id", id).single();
  if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!canManageRole(session.user.role, targetUser.role)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const deletions = [
    supabase.from("user_details").delete().eq("user_id", id),
    supabase.from("applications").delete().eq("user_id", id),
    supabase.from("committee_members").delete().eq("user_id", id),
    supabase.from("roll_call_logs").delete().eq("user_id", id),
    supabase.from("vote_responses").delete().eq("user_id", id),
    supabase.from("resources").delete().eq("uploaded_by", id),
    supabase.from("active_sessions").delete().eq("user_id", id),
    supabase.from("user_warnings").delete().eq("user_id", id),
    supabase.from("payment_receipts").delete().eq("user_id", id),
  ];
  await Promise.all(deletions);
  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) throw error;
  await logAction(session.user.id, "delete_user", { target_user_id: id, deleted_email: targetUser.email, role: targetUser.role }, request);
  return NextResponse.json({ success: true });
});

// Change log:
// - Updated API to handle multiple values for `role`, `status`, and `payment_status` filters.
// - Filters are now passed as comma-separated strings (e.g., `role=admin,superadmin`).
// - The backend parses these and uses Supabase's `.in()` operator for efficient filtering.
// - For payment status, the API now queries the `applications` table to get relevant user IDs, then filters the main `users` query, ensuring performant multi-select on this related data.