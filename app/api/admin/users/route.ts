import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { logAction } from "@/lib/logger";

export async function GET(request: Request) {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
  if (!auth.ok || !auth.session) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
  const session = auth.session;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";
  const role = searchParams.get("role") || "all";
  const sortBy = searchParams.get("sort_by") || "created_at";
  const sortOrder = searchParams.get("sort_order") || "desc";
  const idsParam = searchParams.get("ids"); // New: Filter by comma-separated IDs

  // If IDs are provided, we ignore pagination/search to return specific users (usually for selection preview)
  if (idsParam) {
    const ids = idsParam.split(",").filter(Boolean);
    if (ids.length === 0) return NextResponse.json({ data: [] });

    const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, role, is_suspended")
        .in("id", ids);
    
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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

export async function PUT(request: Request) {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: "superadmin" });
  if (!auth.ok || !auth.session) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
  const session = auth.session;
  // Only superadmin can change roles or suspend users

  try {
    const { id, role, is_suspended } = await request.json();

    // Prevent changing own role or suspending self
    if (session.user.id === id) {
      return NextResponse.json({ error: "Cannot modify own account" }, { status: 400 });
    }

    // Fetch previous state
    const { data: previousState } = await supabase
      .from("users")
      .select("role, is_suspended")
      .eq("id", id)
      .single();

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
        previous_state: previousState
    }, request);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    const auth = await getAuthorization({ requireAuth: true, allowedRoles: "superadmin" });
    if (!auth.ok || !auth.session) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    const session = auth.session;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        if (session.user.id === id) {
            return NextResponse.json({ error: "Cannot delete self" }, { status: 400 });
        }

        // Fetch previous state
        const { data: previousState } = await supabase
            .from("users")
            .select("id, email, role")
            .eq("id", id)
            .single();

        // We assume cascade delete is handled by DB constraints or we handle them sequentially if needed.
        // For 'public.users', usually deleting the user record cascades to details/applications/memberships.
        
        // 1. Delete details first (safeguard if no CASCADE)
        await supabase.from("user_details").delete().eq("user_id", id);
        await supabase.from("applications").delete().eq("user_id", id);
        await supabase.from("committee_members").delete().eq("user_id", id);
        await supabase.from("roll_call_logs").delete().eq("user_id", id);
        
        // 2. Delete user
        const { error } = await supabase.from("users").delete().eq("id", id);

        if (error) throw error;

        await logAction(session.user.id, "delete_user", { 
            target_user_id: id,
            previous_state: previousState
        }, request);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete user error:", error);
        return NextResponse.json({ error: error.message || "Delete failed" }, { status: 500 });
    }
}
// Change Log:
// - Updated PUT and DELETE to include `previous_state` in logs.