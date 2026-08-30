import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { CONFERENCE_ASSIGNMENT_ROLES, ROLES, UserRole } from "@/lib/roles";
import { Logger } from "@/lib/logger";

interface UserParams {
  page: number;
  limit: number;
  search: string;
  role?: string[];
  status?: string[];
  paymentStatus?: string[];
  warnings?: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

async function getUsersByIds(ids: string[]) {
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, role")
    .in("id", ids);

  if (error) throw error;
  return data;
}

async function getFilteredUsers(params: UserParams) {
  const { page, limit, search, role, status, paymentStatus, warnings, sortBy, sortOrder } = params;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Updated select to include high_schools join and high_school_id
  const selectFields = [
    "id, full_name, email, role, account_role, is_suspended, created_at",
    "user_details(id, phone_number, high_school_id, city, grade, profile_picture_url, additional_info, high_schools(school_name))",
    "warnings_count:user_warnings!user_warnings_user_id_fkey(id)",
    "payment_receipts!payment_receipts_user_id_fkey(id)"
  ];

  if (paymentStatus && paymentStatus.length > 0) {
    selectFields.push("application:applications!inner(status, payment_status)");
  } else {
    selectFields.push("application:applications(status, payment_status)");
  }

  if (warnings === "has_warnings") {
    selectFields.push("user_warnings!user_warnings_user_id_fkey!inner(id)");
  }

  let query = supabase.from("users").select(selectFields.join(","), { count: 'exact' });

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  if (role && role.length > 0) {
    const siteRoles = role.filter((value) => value === ROLES.ADMIN || value === ROLES.SUPERADMIN);
    const conferenceRoles = role.filter((value) => value !== ROLES.ADMIN && value !== ROLES.SUPERADMIN);
    const roleIds = new Set<string>();
    if (siteRoles.length) {
      const { data: siteUsers, error: siteUsersError } = await supabase
        .from("users")
        .select("id")
        .in("account_role", siteRoles.map((value) => value === ROLES.SUPERADMIN ? "super_admin" : "site_admin"));
      if (siteUsersError) throw siteUsersError;
      (siteUsers || []).forEach((user) => roleIds.add(String(user.id)));
    }
    if (conferenceRoles.length) {
      const { data: conferenceUsers, error: conferenceUsersError } = await supabase
        .from("users")
        .select("id")
        .in("role", conferenceRoles);
      if (conferenceUsersError) throw conferenceUsersError;
      (conferenceUsers || []).forEach((user) => roleIds.add(String(user.id)));
    }
    query = query.in("id", [...roleIds]);
  }

  if (status && status.length > 0) {
    if (status.includes("suspended") && !status.includes("active")) query = query.eq("is_suspended", true);
    else if (status.includes("active") && !status.includes("suspended")) query = query.eq("is_suspended", false);
  }

  if (paymentStatus && paymentStatus.length > 0) {
    const { data: matchingApplications, error: paymentFilterError } = await supabase
      .from("applications")
      .select("user_id")
      .in("payment_status", paymentStatus);
    if (paymentFilterError) throw paymentFilterError;
    query = query.in("id", (matchingApplications || []).map((application) => application.user_id));
  }

  if (warnings === "has_warnings") {
    const { data: warnedUsers, error: warningFilterError } = await supabase
      .from("user_warnings")
      .select("user_id")
      .limit(10000);
    if (warningFilterError) throw warningFilterError;
    query = query.in("id", [...new Set((warnedUsers || []).map((warning) => warning.user_id))]);
  }

  if (sortBy !== 'warnings_count') {
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  const processedData: ProcessedAdminUser[] = (data || []).map((user) => {
    const row = user as unknown as AdminUserRow;
    const effectiveRole = row.account_role === "super_admin"
      ? ROLES.SUPERADMIN
      : row.account_role === "site_admin"
        ? ROLES.ADMIN
        : row.role;
    return {
      ...row,
      role: effectiveRole,
      warnings_count: row.warnings_count?.[0]?.count ?? row.warnings_count?.length ?? 0,
    };
  });

  if (sortBy === 'warnings_count') {
    processedData.sort((a, b) => {
      return sortOrder === 'asc' 
        ? a.warnings_count - b.warnings_count 
        : b.warnings_count - a.warnings_count;
    });
  }

  return {
    data: processedData,
    meta: {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    }
  };
}

interface AdminUserRow {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  account_role?: string;
  is_suspended?: boolean;
  created_at?: string;
  warnings_count?: Array<{ count?: number }>;
  [key: string]: unknown;
}

type ProcessedAdminUser = Omit<AdminUserRow, "warnings_count"> & { warnings_count: number };

const isConferenceRole = (role: unknown): role is UserRole => typeof role === "string" && CONFERENCE_ASSIGNMENT_ROLES.includes(role as UserRole);
const isSiteRole = (role: unknown): role is string => role === ROLES.ADMIN || role === ROLES.SUPERADMIN;
const isUnassigned = (role: unknown): role is string => role === ROLES.APPLICANT;

async function assignRole(userIds: string[], role: string, actorId: string, actorRole: string) {
  if (!isConferenceRole(role) && !isSiteRole(role) && !isUnassigned(role)) throw new Error("Invalid role assignment.");
  if (isSiteRole(role) && actorRole !== ROLES.SUPERADMIN) {
    throw new Error("Only a super admin can grant site administrator privileges.");
  }

  const { data: targets, error: targetError } = await supabase.from("users").select("id, account_role").in("id", userIds);
  if (targetError || !targets || targets.length !== userIds.length) throw new Error("One or more users could not be found.");
  if ((isConferenceRole(role) || isUnassigned(role)) && targets.some((target) => target.account_role && target.account_role !== "member")) {
    throw new Error("Site administrator accounts cannot receive conference assignments.");
  }

  if (isSiteRole(role)) {
    const { error: assignmentError } = await supabase.from("conference_assignments").delete().in("user_id", userIds);
    if (assignmentError) throw assignmentError;
    const { error: committeeError } = await supabase.from("committee_members").delete().in("user_id", userIds);
    if (committeeError) throw committeeError;
    const { error } = await supabase.from("users").update({ role, account_role: role === ROLES.SUPERADMIN ? "super_admin" : "site_admin", updated_at: new Date().toISOString() }).in("id", userIds);
    if (error) throw error;
  } else if (isUnassigned(role)) {
    const { error: assignmentError } = await supabase.from("conference_assignments").delete().in("user_id", userIds);
    if (assignmentError) throw assignmentError;
    const { error: committeeError } = await supabase.from("committee_members").delete().in("user_id", userIds);
    if (committeeError) throw committeeError;
    const { error } = await supabase.from("users").update({ role: ROLES.APPLICANT, account_role: "member", updated_at: new Date().toISOString() }).in("id", userIds);
    if (error) throw error;
  } else {
    const { error: assignmentError } = await supabase.rpc("assign_ravenmun_conference_role", {
      p_user_ids: userIds,
      p_role: role,
      p_committee_id: null,
      p_actor_id: actorId,
    });
    if (assignmentError) throw assignmentError;
  }

  if (isSiteRole(role) || isUnassigned(role)) {
    await supabase.from("audit_logs").insert({ user_id: actorId, action: "assign_role", resource_type: "user", metadata: { user_ids: userIds, role } });
  }
}


export const GET = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({
    requireAuth: true,
    allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN]
  });
  if (!auth.ok) throw new Error(auth.message);

  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids");

  if (ids) {
    const data = await getUsersByIds(ids.split(","));
    return NextResponse.json({ data });
  }
  
  const params: UserParams = {
    page: parseInt(searchParams.get("page") || "1"),
    limit: parseInt(searchParams.get("limit") || "10"),
    search: searchParams.get("search") || "",
    role: searchParams.get("role")?.split(",").filter(Boolean),
    status: searchParams.get("status")?.split(",").filter(Boolean),
    paymentStatus: searchParams.get("payment_status")?.split(",").filter(Boolean),
    warnings: searchParams.get("warnings") || "all",
    sortBy: searchParams.get("sort_by") || "created_at",
    sortOrder: (searchParams.get("sort_order") as "asc" | "desc") || "desc",
  };

  const result = await getFilteredUsers(params);
  return NextResponse.json(result);
});

export const PUT = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ 
    requireAuth: true, 
    allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] 
  });
  if (!auth.ok || !auth.session) throw new Error(auth.message);
  const adminId = auth.session.user.id;

  const body = await request.json();

  // Role assignment is explicit and validated. Site privileges cannot be
  // granted by ordinary admins, and conference assignments are not account roles.
  if (body.ids && body.role) {
    if (!Array.isArray(body.ids) || body.ids.some((id: unknown) => typeof id !== "string")) throw new Error("Invalid user IDs.");
    await assignRole(body.ids, body.role, adminId, auth.session.user.role);
    return NextResponse.json({ success: true });
  }

  // Action: Single User Update
  if (body.id) {
    const { data: previousUser } = await supabase
      .from("users")
      .select("role, is_suspended")
      .eq("id", body.id)
      .single();

    if (!previousUser) throw new Error("User not found");

    if (body.role) {
      await assignRole([body.id], body.role, adminId, auth.session.user.role);
    }

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.is_suspended === 'boolean') updatePayload.is_suspended = body.is_suspended;

    const { error } = await supabase.from("users").update(updatePayload).eq("id", body.id);
    if (error) throw error;

    const nextState = { ...previousUser, ...updatePayload };

    await Logger.audit(
        { userId: adminId, req: request }, 
        { 
            action: body.role ? "update_role" : "toggle_suspend", 
            resourceType: "user",
            resourceId: body.id,
            prevState: previousUser,
            nextState: nextState
        }
    );

    return NextResponse.json({ success: true });
  }

  throw new Error("Invalid request payload");
});

export const DELETE = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: [ROLES.SUPERADMIN] });
  if (!auth.ok || !auth.session) throw new Error(auth.message);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) throw new Error("Missing ID");

  const { data: userToDelete } = await supabase.from("users").select("email, full_name").eq("id", id).single();

  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) throw error;

  await Logger.audit(
      { userId: auth.session.user.id, req: request }, 
      { 
          action: "delete_user", 
          resourceType: "user",
          resourceId: id,
          metadata: { deleted_user: userToDelete } 
      }
  );

  return NextResponse.json({ success: true });
});
