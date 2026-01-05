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
  const status = searchParams.get("status") || "all"; // active, suspended
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

  // Role Filter
  if (role !== "all") {
    query = query.eq("role", role);
  }

  // Status Filter
  if (status === "suspended") {
    query = query.eq("is_suspended", true);
  } else if (status === "active") {
    query = query.eq("is_suspended", false);
  }

  // Search Filter
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  // Sorting
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

  const body = await request.json();
  const { id, ids, role, is_suspended } = body;

  // Mode 1: Single User Update
  if (id) {
    if (session.user.id === id) {
        return NextResponse.json({ error: "Cannot modify own account" }, { status: 400 });
    }

    const { data: targetUser } = await supabase
        .from("users")
        .select("role, is_suspended")
        .eq("id", id)
        .single();

    if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (!canManageRole(session.user.role, targetUser.role)) {
        return NextResponse.json({ error: "Insufficient permissions to modify this user" }, { status: 403 });
    }

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
  }

  // Mode 2: Batch User Update
  if (ids && Array.isArray(ids) && ids.length > 0) {
      if (role && !canManageRole(session.user.role, role)) {
          return NextResponse.json({ error: "Insufficient permissions to assign this role" }, { status: 403 });
      }
      
      const updates: any = {};
      if (role !== undefined) updates.role = role;
      
      const { error } = await supabase
          .from("users")
          .update(updates)
          .in("id", ids)
          .neq("id", session.user.id);

      if (error) throw error;

      await logAction(session.user.id, "batch_update_users", { 
          target_ids: ids, 
          updates
      }, request);

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

    if (session.user.id === id) {
        return NextResponse.json({ error: "Cannot delete self" }, { status: 400 });
    }

    const { data: targetUser } = await supabase
        .from("users")
        .select("id, email, role")
        .eq("id", id)
        .single();

    if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (!canManageRole(session.user.role, targetUser.role)) {
        return NextResponse.json({ error: "Insufficient permissions to delete this user" }, { status: 403 });
    }

    const deletions = [
      supabase.from("user_details").delete().eq("user_id", id),
      supabase.from("applications").delete().eq("user_id", id),
      supabase.from("committee_members").delete().eq("user_id", id),
      supabase.from("roll_call_logs").delete().eq("user_id", id),
      supabase.from("vote_responses").delete().eq("user_id", id),
      supabase.from("resources").delete().eq("uploaded_by", id),
    ];

    await Promise.all(deletions);
    
    const { error } = await supabase.from("users").delete().eq("id", id);

    if (error) throw error;

    await logAction(session.user.id, "delete_user", { 
        target_user_id: id,
        deleted_email: targetUser.email,
        role: targetUser.role
    }, request);

    return NextResponse.json({ success: true });
});

// Change Log:
// - Added logic to handle `status` query parameter in GET request to filter by `active` or `suspended`.