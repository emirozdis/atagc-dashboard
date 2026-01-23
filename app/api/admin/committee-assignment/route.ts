import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { logAction } from "@/lib/logger";
import { sendSystemNotification } from "@/lib/notification-service";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

export const POST = apiHandler(async (request: Request) => {
    const auth = await getAuthorization({ 
        requireAuth: true, 
        allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] 
    });
    
    if (!auth.ok) throw new Error(auth.message);
    const session = auth.session;

    const { userId, committeeId } = await request.json();

    if (!userId) {
        throw new Error("User ID missing");
    }

    // 0. Check if target user is superadmin
    const { data: targetUser, error: userError } = await supabase
        .from("users")
        .select(`
            role,
            application:applications!applications_user_id_fkey ( 
                form:application_forms ( slug )
            )
        `)
        .eq("id", userId)
        .single();

    if (userError || !targetUser) {
        return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    if (targetUser.role === ROLES.SUPERADMIN) {
        return NextResponse.json({ error: "Süper yöneticiler komiteye atanamaz." }, { status: 403 });
    }

    const allowedRoles = [ROLES.DELEGATE, ROLES.CHAIRMAN, ROLES.DEPUTY_CHAIR];
    const isAllowedRole = allowedRoles.includes(targetUser.role);

    const app = Array.isArray(targetUser.application) ? targetUser.application[0] : targetUser.application;
    const formObj = Array.isArray(app?.form) ? app.form[0] : app?.form;
    const applicantType = formObj?.slug;

    const isDelegateApplicant = targetUser.role === ROLES.APPLICANT && applicantType === ROLES.DELEGATE;

    if (committeeId && !isAllowedRole && !isDelegateApplicant) {
        return NextResponse.json({ error: "Sadece DELEGE rolündeki katılımcılar (veya başkanlar) komiteye atanabilir." }, { status: 403 });
    }

    // 1. Check if user is already in a committee (Previous State)
    const { data: existing } = await supabase
        .from("committee_members")
        .select("id, committee_id")
        .eq("user_id", userId)
        .maybeSingle();

    // If committeeId is provided, we are assigning/updating
    if (committeeId) {
        let isNewAssignment = false;
        if (existing) {
            // Update existing assignment
            const { error } = await supabase
                .from("committee_members")
                .update({ committee_id: committeeId })
                .eq("id", existing.id);
            if (error) throw error;

            await logAction(session?.user?.id, "update_committee_assignment", {
                target_user_id: userId,
                new_committee_id: committeeId,
                previous_state: existing
            }, request);

            if (existing.committee_id !== committeeId) isNewAssignment = true;
        } else {
            // Insert new assignment
            const { error } = await supabase
                .from("committee_members")
                .insert({ user_id: userId, committee_id: committeeId });
            if (error) throw error;

            await logAction(session?.user?.id, "create_committee_assignment", {
                target_user_id: userId,
                committee_id: committeeId,
                previous_state: null
            }, request);
            isNewAssignment = true;
        }

        if (isNewAssignment) {
            await sendSystemNotification(userId, "committee_assignment");
        }

    } else {
        // If committeeId is null/empty/undefined, remove assignment
        if (existing) {
            const { error } = await supabase
                .from("committee_members")
                .delete()
                .eq("user_id", userId);

            if (error) throw error;

            await logAction(session?.user?.id, "delete_committee_assignment", {
                target_user_id: userId,
                previous_state: existing
            }, request);
        }
    }

    return NextResponse.json({ success: true });
});
