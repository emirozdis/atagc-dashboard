import { NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import getAuthorization from "@/lib/getAuthorization";
import { supabase } from "@/lib/SERVER_supabase";
import { ROLES } from "@/lib/roles";
import { HttpError } from "@/lib/http-error";

interface DelegationSummary {
  id: string;
  name: string;
  owner_id: string;
  application_id: string | null;
  created_at?: string | null;
}

interface MembershipSummary {
  delegation_id: string | null;
  delegation?: string | null;
  accepted?: boolean | null;
  joined_at?: string | null;
}

// maybeSingle() never throws: on zero rows it reports "No rows found" and on
// two or more rows "Multiple rows found" (both PGRST116) while resolving to
// null. that made a user with several delegations look like a user with none,
// so every delegation lookup below is an ordered list query and only a real
// database failure is surfaced.
const PGRST_NOT_SINGLE = /multiple rows found|no rows found/i;

function rowsOrThrow<T>(result: { data: unknown; error: { message: string } | null }, message: string): T[] {
  if (result.error && !PGRST_NOT_SINGLE.test(result.error.message)) throw new HttpError(500, message);
  return (Array.isArray(result.data) ? result.data : []) as T[];
}

// delegation_members carries two foreign keys to delegations: the real
// `delegation_id` used by the composite primary key, and a legacy nullable
// `delegation` column that some older rows still populate instead.
function membershipDelegationId(membership: MembershipSummary): string | null {
  return membership.delegation_id || membership.delegation || null;
}

function delegationScope(delegationId: string): string {
  return `delegation_id.eq.${delegationId},delegation.eq.${delegationId}`;
}

// `delegations.application_id` is the authoritative link back to the
// application that created the delegation. the newest-application lookup is
// only correct for legacy rows that predate that link.
async function resolveLeaderApplication(delegation: DelegationSummary) {
  if (delegation.application_id) {
    const { data } = await supabase.from("applications").select("id, status").eq("id", delegation.application_id).maybeSingle();
    return data || null;
  }
  const result = await supabase
    .from("applications")
    .select("id, status")
    .eq("user_id", delegation.owner_id)
    .eq("application_type", "delegation")
    .order("submitted_at", { ascending: false })
    .limit(1);
  return rowsOrThrow<{ id: string; status: string }>(result as { data: unknown; error: { message: string } | null }, "Unable to resolve the leader application.")[0] || null;
}

export const GET = apiHandler(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: [ROLES.ADMIN, ROLES.SUPERADMIN] });
  if (!auth.ok) throw new Error("Unauthorized");
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Application not found." }, { status: 404 });

  const { data: application, error } = await supabase.from("applications").select("id, user_id, application_type, form_id, form_version, form_snapshot, form_data, status, payment_status, review_notes, reviewed_at, submitted_at, updated_at, form:application_forms(*)").eq("id", id).maybeSingle();
  if (error || !application) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  const [{ data: user }, { data: details }, { data: assignment }, ownedDelegationsResult, membershipsResult] = await Promise.all([
    supabase.from("users").select("id, full_name, email, role, created_at, is_suspended").eq("id", application.user_id).maybeSingle(),
    supabase.from("user_details").select("*, high_schools(school_name)").eq("user_id", application.user_id).maybeSingle(),
    supabase.from("conference_assignments").select("role, committee_id, committee:committees(id, name, description, slug)").eq("user_id", application.user_id).maybeSingle(),
    supabase.from("delegations").select("id, name, owner_id, application_id, created_at").eq("owner_id", application.user_id).order("created_at", { ascending: false }),
    supabase.from("delegation_members").select("delegation_id, delegation, accepted, joined_at").eq("user_id", application.user_id).order("joined_at", { ascending: false }),
  ]);
  if (!user) return NextResponse.json({ error: "Applicant not found." }, { status: 404 });

  // newest-first: a leader can own several delegations.
  const ownedDelegations = rowsOrThrow<DelegationSummary>(ownedDelegationsResult as { data: unknown; error: { message: string } | null }, "Unable to load the applicant's delegations.");
  const memberships = rowsOrThrow<MembershipSummary>(membershipsResult as { data: unknown; error: { message: string } | null }, "Unable to load the applicant's delegation memberships.");

  // the singular key is kept for the existing admin screens: prefer the
  // delegation this very application created, else the newest owned one.
  const ownedDelegation = ownedDelegations.find((delegation) => delegation.application_id === id) || ownedDelegations[0] || null;
  const membership = memberships.find((row) => membershipDelegationId(row)) || null;

  let delegationMembers: unknown[] = [];
  let delegationMembersForUser: unknown = null;
  const delegationId = ownedDelegation?.id || (membership ? membershipDelegationId(membership) : null);
  if (delegationId) {
    const { data: delegation } = await supabase.from("delegations").select("id, name, owner_id, application_id").eq("id", delegationId).maybeSingle();
    if (delegation) {
      const { data: leader } = await supabase.from("users").select("id, full_name, email").eq("id", delegation.owner_id).maybeSingle();
      const leaderApplication = await resolveLeaderApplication(delegation as DelegationSummary);
      const { data: members } = await supabase.from("delegation_members").select("user_id, accepted, joined_at, user:users(id, full_name, email)").or(delegationScope(delegation.id));
      delegationMembers = members || [];
      delegationMembersForUser = membership ? {
        delegation: { ...delegation, leader: leader ? { ...leader, application: leaderApplication ? [leaderApplication] : [] } : null },
        accepted: membership.accepted,
      } : null;
    }
  }

  return NextResponse.json({
    ...application,
    user: {
      ...user,
      user_details: details,
      committee_members: assignment?.committee_id ? [{ committee: assignment.committee, can_write: assignment.role === "committee_chairman" || assignment.role === "chair" }] : [],
      delegation_members: delegationMembersForUser,
      owned_delegation: ownedDelegation ? { ...ownedDelegation, members: delegationMembers } : null,
      owned_delegations: ownedDelegations.map((delegation) => ({ ...delegation, members: delegation.id === ownedDelegation?.id ? delegationMembers : [] })),
    },
  });
});
