import "server-only";

import { supabase } from "@/lib/SERVER_supabase";
import { ROLES, UserRole } from "@/lib/roles";

export async function canAccessCommittee(userId: string, role: string, committeeId: string, requireManager = false) {
  if (role === ROLES.SUPERADMIN || role === ROLES.ADMIN) return true;

  const { data: assignment } = await supabase
    .from("conference_assignments")
    .select("role, committee_id")
    .eq("user_id", userId)
    .eq("committee_id", committeeId)
    .maybeSingle();

  if (!assignment) return false;
  if (!requireManager) return true;
  return assignment.role === ROLES.CHAIRMAN || assignment.role === ROLES.DEPUTY_CHAIR;
}

export async function getUserCommittee(userId: string, role?: string) {
  if (role === ROLES.SUPERADMIN || role === ROLES.ADMIN) return null;
  const { data } = await supabase.from("conference_assignments").select("committee_id, role").eq("user_id", userId).maybeSingle();
  return data?.committee_id || null;
}

export function isConferenceRole(role: string): role is UserRole {
  const roles: readonly string[] = [ROLES.DELEGATE, ROLES.CHAIRMAN, ROLES.DEPUTY_CHAIR];
  return roles.includes(role);
}
