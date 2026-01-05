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

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // We explicitly select the count for the sub-resources.
  // Note: committee_members(count) relies on PostgREST aggregate functions.
  // We perform a left join on committees to ensure we get the roll call even if committee is missing (though it shouldn't be).
  
  const { data, error, count } = await supabase
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
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Fetch roll calls error:", error);
    throw error;
  }

  // Debugging: Log if committee is null for any row
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

// Change Log:
// - Wrapped in `apiHandler` for consistent error handling.
// - Explicitly used the relationship alias `committee:committees` and sub-select `committee_members:committee_members(count)` to clarify the intent to Supabase PostgREST.
// - Added logging server-side if committees are returned as null to help debug data consistency issues.
// - Note: If `committee` returns null, it usually means the `committee_id` in `roll_calls` does not match any ID in `committees` table, or the FK constraint is violated/missing (though schema says it exists).