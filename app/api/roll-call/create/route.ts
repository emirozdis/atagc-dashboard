import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { v4 as uuidv4 } from 'uuid';
import { logAction } from "@/lib/logger";
import crypto from "crypto";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

export const POST = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ 
    requireAuth: true, 
    allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.DEPUTY_CHAIR] 
  });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const session = auth.session;

  const body = await request.json();
  const session_name = body.session_name;
  let committee_id = body.committee_id;

  if (!committee_id) {
    const { data: adminCommittee } = await supabase.from("committees").select("id").eq("admin_id", session.user.id).maybeSingle();
    if (adminCommittee) {
      committee_id = adminCommittee.id;
    } else {
      const { data: memberCommittee } = await supabase.from("committee_members").select("committee_id").eq("user_id", session.user.id).maybeSingle();
      if (memberCommittee) {
        committee_id = memberCommittee.committee_id;
      }
    }
  }

  if (!committee_id) {
    return NextResponse.json({ error: "Committee not found for this user" }, { status: 400 });
  }

  const uniqueToken = uuidv4();
  const secretKey = crypto.randomBytes(16).toString('hex');

  const { data, error } = await supabase
    .from("roll_calls")
    .insert({
      committee_id,
      session_name,
      qr_code: uniqueToken, 
      secret_key: secretKey
    })
    .select("id, session_name, committee_id, created_at")
    .single();

  if (error) throw error;

  await logAction(session.user.id, "create_roll_call_session", { roll_call_id: data.id, session_name, committee_id }, request);

  return NextResponse.json(data);
});