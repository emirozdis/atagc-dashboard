import { NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import getAuthorization from "@/lib/getAuthorization";
import { supabase } from "@/lib/SERVER_supabase";
import { ROLES } from "@/lib/roles";
import { verifyParticipantQrPayload } from "@/lib/security-token";

const schema = z.object({ payload: z.string().min(1).max(500) });

export const POST = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.SECURITY, ROLES.HEAD_SECURITY] });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const { payload } = schema.parse(await request.json());

  const userId = verifyParticipantQrPayload(payload);
  if (!userId) return NextResponse.json({ success: false, result: "invalid", user: null }, { status: 400 });

  const { data: user } = await supabase.from("users").select("id, full_name, email, role, is_suspended").eq("id", userId).maybeSingle();
  const result = !user ? "unknown" : user.is_suspended ? "suspended" : "allowed";
  if (user) await supabase.from("security_entry_logs").insert({ scanned_user_id: user.id, scanned_by: auth.session.user.id, result, metadata: { user_agent: request.headers.get("user-agent") } });
  return NextResponse.json({ success: result === "allowed", result, user: user ? { id: user.id, fullName: user.full_name, email: user.email, role: user.role } : null });
});
