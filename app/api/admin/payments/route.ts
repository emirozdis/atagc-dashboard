import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";

export const GET = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
  if (!auth.ok) throw new Error("Unauthorized");

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const status = searchParams.get("status") || "pending";
  const search = searchParams.get("search") || "";

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Added `reviewer` relation to the query
  let query = supabase
    .from("payment_receipts")
    .select(`
        id, created_at, status, file_type,
        user:users!payment_receipts_user_id_fkey ( id, full_name, email ),
        reviewer:users!payment_receipts_reviewed_by_fkey ( full_name )
    `, { count: 'exact' });

  if (status !== 'all') {
      query = query.eq('status', status);
  }

  if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`, { foreignTable: 'users' });
  }

  query = query.order("created_at", { ascending: status === 'pending' });
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  return NextResponse.json({
    data,
    meta: {
      total: count,
      page,
      totalPages: Math.ceil((count || 0) / limit)
    }
  });
});

// Change Log:
// - Added `reviewer:users!payment_receipts_reviewed_by_fkey ( full_name )` to the Supabase select query to fetch reviewer details.