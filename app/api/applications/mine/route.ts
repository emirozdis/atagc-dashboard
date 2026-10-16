import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import getAuthorization from "@/lib/getAuthorization";
import { supabase } from "@/lib/SERVER_supabase";
import { HttpError } from "@/lib/http-error";

interface DelegationSummary {
  id: string;
  name: string;
  application_id: string | null;
  owner_id: string;
  created_at?: string | null;
}

interface MembershipSummary {
  delegation_id: string | null;
  delegation?: string | null;
  accepted?: boolean | null;
  joined_at?: string | null;
}

type MemberRow = { delegation_id: string; user_id: string; accepted: boolean; joined_at: string | null };

// maybeSingle() resolves to null plus a "No rows found"/"Multiple rows found"
// error (PGRST116) instead of throwing, which made a member of several
// delegations look like a member of none. every delegation lookup here is an
// ordered list query now, so extra rows are data - never an error.
const PGRST_NOT_SINGLE = /multiple rows found|no rows found/i;

function rowsOrThrow<T>(result: { data: unknown; error: { message: string } | null }): T[] {
  if (result.error && !PGRST_NOT_SINGLE.test(result.error.message)) throw new HttpError(400, "Unable to load your portal data.");
  return (Array.isArray(result.data) ? result.data : []) as T[];
}

// delegation_members has two foreign keys to delegations: the real
// `delegation_id` in the composite primary key and a legacy nullable
// `delegation` column that some older rows populate instead.
function membershipDelegationId(membership: MembershipSummary): string | null {
  return membership.delegation_id || membership.delegation || null;
}

function delegationScope(delegationId: string): string {
  return `delegation_id.eq.${delegationId},delegation.eq.${delegationId}`;
}

export const GET = apiHandler(async () => {
  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");

  const [applications, assignment, ownedDelegationsResult, membershipsResult] = await Promise.all([
    supabase.from("applications").select("id, application_type, status, payment_status, form_version, form_snapshot, form_data, review_notes, reviewed_at, submitted_at, updated_at").eq("user_id", auth.session.user.id).order("submitted_at", { ascending: false }),
    supabase.from("conference_assignments").select("role, committee_id, assigned_at, committee:committees(id, name, slug)").eq("user_id", auth.session.user.id).maybeSingle(),
    // newest-first: a leader can own several delegations.
    supabase.from("delegations").select("id, name, application_id, owner_id, created_at").eq("owner_id", auth.session.user.id).order("created_at", { ascending: false }),
    supabase.from("delegation_members").select("delegation_id, delegation, accepted, joined_at").eq("user_id", auth.session.user.id).order("joined_at", { ascending: false }),
  ]);

  if (applications.error) throw new Error("Unable to load your portal data.");
  if (assignment.error) throw new HttpError(400, "Unable to load your portal data.");

  const ownedDelegations = rowsOrThrow<DelegationSummary>(ownedDelegationsResult as { data: unknown; error: { message: string } | null });
  const memberships = rowsOrThrow<MembershipSummary>(membershipsResult as { data: unknown; error: { message: string } | null });

  // the delegations a user only belongs to, newest-first, de-duplicated across
  // both membership columns.
  const membershipDelegationIds: string[] = [];
  for (const membership of memberships) {
    const membershipId = membershipDelegationId(membership);
    if (membershipId && !membershipDelegationIds.includes(membershipId)) membershipDelegationIds.push(membershipId);
  }
  const joinedIds = membershipDelegationIds.filter((membershipId) => !ownedDelegations.some((owned) => owned.id === membershipId));
  let joinedDelegations: DelegationSummary[] = [];
  if (joinedIds.length > 0) {
    const joinedResult = await supabase
      .from("delegations")
      .select("id, name, application_id, owner_id, created_at")
      .in("id", joinedIds);
    joinedDelegations = rowsOrThrow<DelegationSummary>(joinedResult as { data: unknown; error: { message: string } | null });
    joinedDelegations.sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || "")));
  }

  // the singular key stays for the current portal: newest owned delegation,
  // else the newest delegation the user merely belongs to.
  const delegation = ownedDelegations[0] || joinedDelegations[0] || null;

  let delegationWithMembers: (DelegationSummary & { delegation_members: MemberRow[] }) | null = null;
  if (delegation) {
    const { data: members, error: membersError } = await supabase.from("delegation_members").select("delegation_id, user_id, accepted, joined_at").or(delegationScope(delegation.id));
    if (membersError && !PGRST_NOT_SINGLE.test(membersError.message)) throw new HttpError(400, "Unable to load your delegation.");
    delegationWithMembers = { ...delegation, delegation_members: (members || []) as MemberRow[] };
  }

  return NextResponse.json({
    applications: applications.data || [],
    assignment: assignment.data || null,
    delegation: delegationWithMembers || null,
    delegations: ownedDelegations,
    memberships,
  });
});
