import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

export const PUT = apiHandler(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const auth = await getAuthorization({ 
    requireAuth: true, 
    allowedRoles: [ROLES.CHAIRMAN, ROLES.DEPUTY_CHAIR, ROLES.SUPERADMIN] 
  });
  if (!auth.ok) throw new Error("Unauthorized");

  const { id } = await params;
  
  const body = await request.json();
  const status = body.status;

  if (!status || (status !== 'open' && status !== 'closed')) {
      throw new Error("Invalid status");
  }

  const { error } = await supabase
    .from("votes")
    .update({ status })
    .eq("id", id);

  if (error) throw error;

  return NextResponse.json({ success: true });
});