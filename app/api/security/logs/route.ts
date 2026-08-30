import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import getAuthorization from "@/lib/getAuthorization";
import { supabase } from "@/lib/SERVER_supabase";
import { ROLES } from "@/lib/roles";

export const GET = apiHandler(async () => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.HEAD_SECURITY] });
  if (!auth.ok) throw new Error("Unauthorized");
  const { data, error } = await supabase.from("security_entry_logs").select("id, scanned_at, result, metadata, user:users!security_entry_logs_scanned_user_id_fkey(full_name,email,role), scanner:users!security_entry_logs_scanned_by_fkey(full_name)").order("scanned_at", { ascending: false }).limit(200);
  if (error) throw error;
  return NextResponse.json(data || []);
});
