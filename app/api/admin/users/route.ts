import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { logAction } from "@/lib/logger";
import { apiHandler } from "@/lib/api-handler";
import { canManageRole } from "@/lib/permissions";

export const GET = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";
  const role = searchParams.get("role") || "all";
  const sortBy = searchParams.get("sort_by") || "created_at";
  const sortOrder = searchParams.get("sort_order") || "desc";
  const idsParam = searchParams.get("ids"); 

  if (idsParam) {
    const ids = idsParam.split(",").filter(Boolean);
    if (ids.length === 0) return NextResponse.json({ data: [] });

    const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, role, is_suspended")
        .in("id", ids);
    
    if (error) throw error;
    return NextResponse.json({ data });
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("users")
    .select(`
      id, 
      full_name, 
      email, 
      role, 
      is_suspended, 
      created_at, 
      user_details(school_name, phone_number, birth_date, additional_info),
      committee_members(committee:committees(id, name)),
      application:applications(id, status)
    `, { count: "exact" });

  if (role !== "all") {
    query = query.eq("role", role);
  }

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(from, to);

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

export const PUT = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const session = auth.session;

  const { id, role, is_suspended } = await request.json();

  if (session.user.id === id) {
    return NextResponse.json({ error: "Cannot modify own account" }, { status: 400 });
  }

  // 1. Fetch Target User to check hierarchy
  const { data: targetUser } = await supabase
    .from("users")
    .select("role, is_suspended")
    .eq("id", id)
    .single();

  if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // 2. Permission Check
  if (!canManageRole(session.user.role, targetUser.role)) {
    return NextResponse.json({ error: "Insufficient permissions to modify this user" }, { status: 403 });
  }

  // If changing role, check if user can assign that new role
  if (role && !canManageRole(session.user.role, role)) {
    return NextResponse.json({ error: "Insufficient permissions to assign this role" }, { status: 403 });
  }

  const updates: any = {};
  if (role !== undefined) updates.role = role;
  if (is_suspended !== undefined) updates.is_suspended = is_suspended;

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", id);

  if (error) throw error;

  await logAction(session.user.id, "update_user", { 
      target_user_id: id, 
      updates,
      previous_state: targetUser
  }, request);

  return NextResponse.json({ success: true });
});

export const DELETE = apiHandler(async (request: Request) => {
    const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
    if (!auth.ok || !auth.session) throw new Error("Unauthorized");
    const session = auth.session;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    if (session.user.id === id) {
        return NextResponse.json({ error: "Cannot delete self" }, { status: 400 });
    }

    // 1. Fetch Target to check permissions
    const { data: targetUser } = await supabase
        .from("users")
        .select("id, email, role")
        .eq("id", id)
        .single();

    if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // 2. Permission Check
    if (!canManageRole(session.user.role, targetUser.role)) {
        return NextResponse.json({ error: "Insufficient permissions to delete this user" }, { status: 403 });
    }

    // 3. Cascade Deletions (Manual Integrity)
    // We explicitly delete related records to prevent orphaned rows if FK constraints aren't set to CASCADE in DB
    const deletions = [
      supabase.from("user_details").delete().eq("user_id", id),
      supabase.from("applications").delete().eq("user_id", id),
      supabase.from("committee_members").delete().eq("user_id", id),
      supabase.from("roll_call_logs").delete().eq("user_id", id),
      supabase.from("vote_responses").delete().eq("user_id", id),
      supabase.from("resources").delete().eq("uploaded_by", id), // New: Resources
      // Notes: Logs are usually kept even if user is deleted, or set user_id to NULL
    ];

    await Promise.all(deletions);
    
    // 4. Delete user
    const { error } = await supabase.from("users").delete().eq("id", id);

    if (error) throw error;

    await logAction(session.user.id, "delete_user", { 
        target_user_id: id,
        deleted_email: targetUser.email,
        role: targetUser.role
    }, request);

    return NextResponse.json({ success: true });
});

/* Change Log:
- Wrapped in `apiHandler`.
- Implemented `canManageRole` logic to enforce hierarchy (Admin cannot ban Superadmin).
- Enhanced DELETE cascade to include `vote_responses` and `resources`.
*/