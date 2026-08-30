import { NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import getAuthorization from "@/lib/getAuthorization";
import { supabase } from "@/lib/SERVER_supabase";
import { ROLES } from "@/lib/roles";

export const GET = apiHandler(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: [ROLES.ADMIN, ROLES.SUPERADMIN] });
  if (!auth.ok) throw new Error("Unauthorized");
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Application not found." }, { status: 404 });

  const { data: application, error } = await supabase.from("applications").select("id, user_id, application_type, form_id, form_version, form_snapshot, form_data, status, payment_status, review_notes, reviewed_at, submitted_at, updated_at, form:application_forms(*)").eq("id", id).maybeSingle();
  if (error || !application) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  const [{ data: user }, { data: details }, { data: assignment }, { data: ownedDelegation }, { data: membership }] = await Promise.all([
    supabase.from("users").select("id, full_name, email, role, created_at, is_suspended").eq("id", application.user_id).maybeSingle(),
    supabase.from("user_details").select("*").eq("user_id", application.user_id).maybeSingle(),
    supabase.from("conference_assignments").select("role, committee_id, committee:committees(id, name, description, slug)").eq("user_id", application.user_id).maybeSingle(),
    supabase.from("delegations").select("id, name, owner_id, application_id").eq("owner_id", application.user_id).maybeSingle(),
    supabase.from("delegation_members").select("delegation_id, accepted").eq("user_id", application.user_id).maybeSingle(),
  ]);
  if (!user) return NextResponse.json({ error: "Applicant not found." }, { status: 404 });

  let delegationMembers: unknown[] = [];
  let delegationMembersForUser: unknown = null;
  const delegationId = ownedDelegation?.id || membership?.delegation_id;
  if (delegationId) {
    const { data: delegation } = await supabase.from("delegations").select("id, name, owner_id").eq("id", delegationId).maybeSingle();
    if (delegation) {
      const { data: leader } = await supabase.from("users").select("id, full_name, email").eq("id", delegation.owner_id).maybeSingle();
      const { data: members } = await supabase.from("delegation_members").select("user_id, accepted, joined_at, user:users(id, full_name, email)").eq("delegation_id", delegation.id);
      delegationMembers = members || [];
      delegationMembersForUser = { delegation: { ...delegation, leader }, accepted: membership?.accepted ?? true };
    }
  }

  return NextResponse.json({
    ...application,
    user: { ...user, user_details: details, committee_members: assignment?.committee_id ? [{ committee: assignment.committee, can_write: assignment.role === "committee_chairman" || assignment.role === "chair" }] : [], delegation_members: delegationMembersForUser, owned_delegation: ownedDelegation ? { ...ownedDelegation, members: delegationMembers } : null },
  });
});
