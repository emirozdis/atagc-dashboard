import { NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import getAuthorization from "@/lib/getAuthorization";
import { supabase } from "@/lib/SERVER_supabase";
import { CONFERENCE_ASSIGNMENT_ROLES, ROLES } from "@/lib/roles";

const inputSchema = z.object({ userId: z.uuid(), committeeId: z.uuid().nullable(), role: z.string().optional() });
const committeeRoles = [ROLES.DELEGATE, ROLES.CHAIRMAN, ROLES.DEPUTY_CHAIR] as const;

export const POST = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const input = inputSchema.parse(await request.json());

  const [{ data: target }, { data: currentAssignment }, { data: delegateApplication }] = await Promise.all([
    supabase.from("users").select("id, role, account_role").eq("id", input.userId).maybeSingle(),
    supabase.from("conference_assignments").select("role, committee_id").eq("user_id", input.userId).maybeSingle(),
    supabase.from("applications").select("application_type, status").eq("user_id", input.userId).eq("application_type", "delegate").maybeSingle(),
  ]);
  if (!target) throw new Error("User not found.");
  if (target.account_role && target.account_role !== "member") throw new Error("Site administrators cannot be assigned to committees.");

  const desiredRole = input.role || currentAssignment?.role || (target.role === ROLES.DELEGATE || target.role === ROLES.CHAIRMAN || target.role === ROLES.DEPUTY_CHAIR ? target.role : delegateApplication?.application_type === "delegate" ? ROLES.DELEGATE : null);
  if (!desiredRole || !committeeRoles.includes(desiredRole as typeof committeeRoles[number])) throw new Error("A delegate or chairboard role is required for committee assignment.");
  if (!CONFERENCE_ASSIGNMENT_ROLES.includes(desiredRole as typeof CONFERENCE_ASSIGNMENT_ROLES[number])) throw new Error("Invalid conference assignment role.");

  const { error } = await supabase.rpc("assign_ravenmun_conference_role", {
    p_user_ids: [input.userId],
    p_role: desiredRole,
    p_committee_id: input.committeeId,
    p_actor_id: auth.session.user.id,
  });
  if (error) throw error;

  return NextResponse.json({ success: true, assignment: { userId: input.userId, committeeId: input.committeeId, role: desiredRole } });
});
