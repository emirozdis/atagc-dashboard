import "server-only";

import { supabase } from "@/lib/SERVER_supabase";
import { CONFERENCE_ASSIGNMENT_ROLES, ROLES, UserRole } from "@/lib/roles";
import { ApplicationStatus, ApplicationStatusEnum } from "@/types/application";

const APPLICATION_STATUSES: readonly ApplicationStatus[] = Object.values(ApplicationStatusEnum);

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && Object.values(ROLES).includes(value as UserRole);
}

function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return typeof value === "string" && APPLICATION_STATUSES.includes(value as ApplicationStatus);
}

export async function getCurrentAuthorizationState(userId: string) {
  const [{ data: account, error: accountError }, { data: assignment, error: assignmentError }, { data: latestApplication, error: applicationError }] = await Promise.all([
    supabase
      .from("users")
      .select("id, role, account_role, is_suspended")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("conference_assignments")
      .select("role, committee_id")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("applications")
      .select("status, submitted_at")
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (accountError || assignmentError || applicationError || !account) {
    throw new Error("Unable to load account authorization.");
  }

  const accountRole = account.account_role === "super_admin"
    ? ROLES.SUPERADMIN
    : account.account_role === "site_admin"
      ? ROLES.ADMIN
      : null;
  const assignedRole = isUserRole(assignment?.role) && CONFERENCE_ASSIGNMENT_ROLES.includes(assignment.role)
    ? assignment.role
    : null;
  const role = accountRole || assignedRole || (isUserRole(account.role) ? account.role : ROLES.APPLICANT);
  const applicationStatus = assignedRole
    ? ApplicationStatusEnum.APPROVED
    : isApplicationStatus(latestApplication?.status)
      ? latestApplication.status
      : undefined;

  return {
    isSuspended: account.is_suspended === true,
    role,
    applicantType: assignedRole || (isUserRole(account.role) ? account.role : ROLES.APPLICANT),
    committeeId: assignment?.committee_id || null,
    applicationStatus,
  };
}
