import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

export const GET = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ 
    requireAuth: true, 
    allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] 
  });
  if (!auth.ok) throw new Error(auth.message);

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") || "all";
  const committeeId = searchParams.get("committee_id");

  let query = supabase.from("users").select("id");

  if (role !== "all") {
    query = query.eq("role", role);
  }

  if (committeeId) {
    const { data, error } = await supabase
        .from("committee_members")
        .select("user_id")
        .eq("committee_id", committeeId);
    
    if (error) throw error;
    
    const ids = data.map(r => r.user_id);
    return NextResponse.json(ids);
  }

  const { data, error } = await query;

  if (error) throw error;
  
  const ids = data.map(u => u.id);
  return NextResponse.json(ids);
});
