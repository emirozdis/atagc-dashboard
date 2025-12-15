import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "superadmin" && session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    // Limit the number of IDs to prevent massive query issues (e.g. max 50 for preview)
    // If you need all, specific logic handles bulk. 
    // Here we fetch details for the specific IDs requested.
    const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, role")
        .in("id", ids);
    
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("users")
    .select("id, full_name, email, role, created_at, user_details(school_name, phone_number)", { count: "exact" });

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
  const session = await getServerSession(authOptions);
  // Only superadmin can change roles
  if (session?.user?.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, role } = await request.json();

    // Prevent changing own role to lock oneself out
    if (session.user.id === id) {
      return NextResponse.json({ error: "Cannot change own role" }, { status: 400 });
    }

    const { error } = await supabase
      .from("users")
      .update({ role })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}