import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { parsePagination } from "@/lib/pagination";

export const GET = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
  if (!auth.ok) throw new Error("Unauthorized");

  const { searchParams } = new URL(request.url);
  const { page, limit, from, to } = parsePagination(searchParams, { defaultLimit: 20, maxLimit: 20 });
  const status = searchParams.get("status") || "pending";
  const search = searchParams.get("search") || "";

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
      // The compatibility layer cannot filter an embedded relation, so resolve
      // matching users first and filter the receipts by their ids.
      const { data: matchingUsers, error: userSearchError } = await supabase
          .from("users")
          .select("id")
          .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      if (userSearchError) throw userSearchError;
      query = query.in("user_id", (matchingUsers || []).map((user) => user.id));
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
