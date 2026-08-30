import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { v4 as uuidv4 } from 'uuid';
import { Logger } from "@/lib/logger";
import crypto from "crypto";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";
import { canAccessCommittee, getUserCommittee } from "@/lib/committee-access";

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
    committee_id = await getUserCommittee(session.user.id, session.user.role);
  }

  if (!committee_id) {
    return NextResponse.json({ error: "Committee not found for this user" }, { status: 400 });
  }
  if (!(await canAccessCommittee(session.user.id, session.user.role, committee_id, true))) {
    return NextResponse.json({ error: "Forbidden: you cannot create roll calls for this committee" }, { status: 403 });
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

  await Logger.audit(
      { userId: session.user.id, req: request },
      { 
          action: "create_roll_call_session", 
          category: "business",
          resourceType: "roll_call",
          resourceId: data.id,
          metadata: { session_name, committee_id }
      }
  );

  return NextResponse.json(data);
});
