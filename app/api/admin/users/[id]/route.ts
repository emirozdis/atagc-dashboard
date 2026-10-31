import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { CONFERENCE_ASSIGNMENT_ROLES, ROLES, UserRole } from "@/lib/roles";
import { getSignedUrl } from "@/lib/storage-utils";

interface AccountRow {
    id: string;
    full_name: string | null;
    email: string;
    role: string;
    account_role: string | null;
    is_suspended: boolean | null;
    created_at: string;
}

interface AssignmentRow {
    role: string | null;
    committee_id: string | null;
    committee?: { id: string; name: string; slug?: string | null } | { id: string; name: string; slug?: string | null }[] | null;
}

interface UserDetailsRow {
    profile_picture_url?: string | null;
    [key: string]: unknown;
}

export const GET = apiHandler(async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) => {
    const auth = await getAuthorization({ 
        requireAuth: true, 
        allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.DEPUTY_CHAIR] 
    });
    if (!auth.ok || !auth.session) throw new Error(auth.message);
    const session = auth.session;
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (session.user.role === ROLES.CHAIRMAN || session.user.role === ROLES.DEPUTY_CHAIR) {
        const { data: relation } = await supabase
            .from("committee_members")
            .select("committee_id")
            .eq("user_id", id)
            .maybeSingle();
        
        const targetCommitteeId = relation?.committee_id;
        
        let adminCommitteeId = null;
        const { data: managed } = await supabase.from("committees").select("id").eq("admin_id", session.user.id).maybeSingle();
        if (managed) adminCommitteeId = managed.id;
        else {
             const { data: membership } = await supabase.from("committee_members").select("committee_id").eq("user_id", session.user.id).maybeSingle();
             adminCommitteeId = membership?.committee_id;
        }

        if (!targetCommitteeId || targetCommitteeId !== adminCommitteeId) {
             return NextResponse.json({ error: "This user is not in your committee." }, { status: 403 });
        }
    }

    const [
        accountResult,
        detailsResult,
        assignmentResult,
        membershipsResult,
        managedResult,
        applicationsResult,
        receiptsResult,
        warningsResult,
    ] = await Promise.all([
        supabase
            .from("users")
            .select("id, full_name, email, role, account_role, is_suspended, created_at")
            .eq("id", id)
            .maybeSingle(),
        supabase
            .from("user_details")
            .select("user_id, phone_number, birth_date, school, city, grade, profile_picture_url, is_profile_picture_hidden, allow_connections, notification_preferences, additional_info, high_school_id, high_schools(school_name)")
            .eq("user_id", id)
            .maybeSingle(),
        supabase
            .from("conference_assignments")
            .select("role, committee_id, committee:committees(id, name, slug)")
            .eq("user_id", id)
            .maybeSingle(),
        supabase
            .from("committee_members")
            .select("committee_id, committee:committees(id, name, slug)")
            .eq("user_id", id),
        supabase
            .from("committees")
            .select("id, name")
            .eq("admin_id", id),
        supabase
            .from("applications")
            .select("id, form_id, application_type, status, payment_status, form_data, review_notes, reviewed_at, submitted_at, updated_at, form:application_forms(id, slug, title, steps, fee)")
            .eq("user_id", id)
            .order("submitted_at", { ascending: false }),
        supabase
            .from("payment_receipts")
            .select("id, status, created_at")
            .eq("user_id", id)
            .order("created_at", { ascending: false }),
        supabase
            .from("user_warnings")
            .select("id, user_id, issued_by, reason, category, created_at, issuer:users!issued_by(id, full_name, role)")
            .eq("user_id", id)
            .order("created_at", { ascending: false }),
    ]);

    if (accountResult.error) {
        console.error("User profile lookup failed:", accountResult.error);
        throw new Error("Failed to fetch user profile");
    }
    const account = accountResult.data as AccountRow | null;
    if (!account) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (detailsResult.error || assignmentResult.error || membershipsResult.error || managedResult.error || applicationsResult.error || receiptsResult.error || warningsResult.error) {
        console.error("User profile relations failed:", {
            details: detailsResult.error,
            assignment: assignmentResult.error,
            memberships: membershipsResult.error,
            managed: managedResult.error,
            applications: applicationsResult.error,
            receipts: receiptsResult.error,
            warnings: warningsResult.error,
        });
        throw new Error("Failed to fetch user profile");
    }

    const details = (detailsResult.data as UserDetailsRow | null) ?? null;
    if (details?.profile_picture_url) {
        details.profile_picture_url = await getSignedUrl(
            "profile-pictures",
            details.profile_picture_url,
        );
    }

    // Keep the displayed role consistent with authorization: a site admin role
    // wins, then the conference assignment, then the stored legacy role.
    const assignment = assignmentResult.data as AssignmentRow | null;
    const assignmentRole = assignment?.role;
    const role = account.account_role === "super_admin"
        ? ROLES.SUPERADMIN
        : account.account_role === "site_admin"
            ? ROLES.ADMIN
            : assignmentRole && CONFERENCE_ASSIGNMENT_ROLES.includes(assignmentRole as UserRole)
                ? assignmentRole
                : account.role;

    const assignmentCommittee = Array.isArray(assignment?.committee)
        ? assignment?.committee[0] ?? null
        : assignment?.committee ?? null;
    const committeeMembers = assignmentCommittee
        ? [{ committee: assignmentCommittee }]
        : membershipsResult.data || [];
    const userWarnings = Array.isArray(warningsResult.data) ? warningsResult.data : [];

    return NextResponse.json({
        ...account,
        role,
        account_role: account.account_role,
        user_details: details,
        committee_members: committeeMembers,
        managed_committees: managedResult.data || [],
        application: applicationsResult.data || [],
        payment_receipts: receiptsResult.data || [],
        user_warnings: userWarnings,
        warnings_count: userWarnings.length,
    });
});
