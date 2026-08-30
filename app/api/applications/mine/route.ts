import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import getAuthorization from "@/lib/getAuthorization";
import { supabase } from "@/lib/SERVER_supabase";

export const GET = apiHandler(async () => {
  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");

  const [applications, assignment, ownedDelegation, membership] = await Promise.all([
    supabase.from("applications").select("id, application_type, status, payment_status, form_version, form_snapshot, form_data, review_notes, reviewed_at, submitted_at, updated_at").eq("user_id", auth.session.user.id).order("submitted_at", { ascending: false }),
    supabase.from("conference_assignments").select("role, committee_id, assigned_at, committee:committees(id, name, slug)").eq("user_id", auth.session.user.id).maybeSingle(),
    supabase.from("delegations").select("id, name, application_id, owner_id").eq("owner_id", auth.session.user.id).maybeSingle(),
    supabase.from("delegation_members").select("delegation_id").eq("user_id", auth.session.user.id).maybeSingle(),
  ]);

  if (applications.error || assignment.error || ownedDelegation.error || membership.error) throw new Error("Unable to load your portal data.");
  let delegation = ownedDelegation.data;
  if (!delegation && membership.data?.delegation_id) {
    const { data } = await supabase.from("delegations").select("id, name, application_id, owner_id").eq("id", membership.data.delegation_id).maybeSingle();
    delegation = data;
  }
  let delegationWithMembers = delegation ? { ...delegation, delegation_members: [] as Array<{ delegation_id: string; user_id: string; accepted: boolean; joined_at: string | null }> } : null;
  if (delegation) {
    const { data: members, error: membersError } = await supabase.from("delegation_members").select("delegation_id, user_id, accepted, joined_at").eq("delegation_id", delegation.id);
    if (membersError) throw new Error("Unable to load your delegation.");
    delegationWithMembers = { ...delegation, delegation_members: members || [] };
  }
  return NextResponse.json({ applications: applications.data || [], assignment: assignment.data || null, delegation: delegationWithMembers || null });
});
