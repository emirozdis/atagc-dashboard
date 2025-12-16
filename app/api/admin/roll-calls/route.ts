import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";

export async function GET(request: Request) {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
  if (!auth.ok) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
  const session = auth.session;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Fetch roll calls with committee info (including total member count) and count of logs (attendees)
  // Note: 'committee_members' count inside 'committee' gives total registered to that committee.
  const { data, error, count } = await supabase
    .from("roll_calls")
    .select(`
      id,
      session_name,
      created_at,
      committee:committees ( 
        name,
        committee_members ( count )
      ),
      roll_call_logs ( count )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Fetch roll calls error:", error);
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
// - Implemented pagination logic using `range(from, to)`.
// - Updated select query to include `committee_members ( count )` to fetch total participants per committee.
// - Returns data wrapped in `{ data, meta }` format for pagination controls.