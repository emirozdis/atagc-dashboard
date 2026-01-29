import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { Logger } from "@/lib/logger";
import { sendSystemNotification } from "@/lib/notification-service";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";
import { committeeAssignmentSchema } from "@/lib/schemas";

async function validateAssignment(userId: string, committeeId: string | null) {
    const { data: targetUser, error } = await supabase
        .from("users")
        .select(`
            role,
            application:applications(form:application_forms(slug))
        `)
        .eq("id", userId)
        .single();

    if (error || !targetUser) throw new Error("Kullanıcı bulunamadı.");

    if (targetUser.role === ROLES.SUPERADMIN) {
        throw new Error("Süper yöneticiler komiteye atanamaz.");
    }

    if (!committeeId) return targetUser;

    const allowedRoles = [ROLES.DELEGATE, ROLES.CHAIRMAN, ROLES.DEPUTY_CHAIR];
    const isAllowedRole = allowedRoles.includes(targetUser.role);

    const app = Array.isArray(targetUser.application) ? targetUser.application[0] : targetUser.application;
    const formObj = Array.isArray(app?.form) ? app.form[0] : app?.form;
    const isDelegateApplicant = targetUser.role === ROLES.APPLICANT && formObj?.slug === ROLES.DELEGATE;

    if (!isAllowedRole && !isDelegateApplicant) {
        throw new Error("Sadece DELEGE rolündeki katılımcılar (veya başkanlar) komiteye atanabilir.");
    }

    return targetUser;
}

export const POST = apiHandler(async (request: Request) => {
    const auth = await getAuthorization({ 
        requireAuth: true, 
        allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] 
    });
    
    if (!auth.ok || !auth.session) throw new Error(auth.message || "Unauthorized");
    const session = auth.session;

    const body = await request.json();
    const { userId, committeeId } = committeeAssignmentSchema.parse(body);

    await validateAssignment(userId, committeeId);

    const { data: existing } = await supabase
        .from("committee_members")
        .select("id, committee_id")
        .eq("user_id", userId)
        .maybeSingle();

    if (committeeId) {
        // ASSIGN / UPDATE
        if (existing) {
            if (existing.committee_id !== committeeId) {
                const { error } = await supabase
                    .from("committee_members")
                    .update({ committee_id: committeeId })
                    .eq("id", existing.id);
                if (error) throw error;

                await Logger.audit(
                    { userId: session.user.id, req: request },
                    { 
                        action: "update_committee_assignment", 
                        category: "access",
                        resourceType: "committee_member",
                        resourceId: existing.id,
                        prevState: { committee_id: existing.committee_id },
                        nextState: { committee_id: committeeId },
                        metadata: { target_user_id: userId }
                    }
                );

                await sendSystemNotification(userId, "committee_assignment");
            }
        } else {
            // Insert
            const { data: newMember, error } = await supabase
                .from("committee_members")
                .insert({ user_id: userId, committee_id: committeeId })
                .select("id")
                .single();
            if (error) throw error;

            await Logger.audit(
                { userId: session.user.id, req: request },
                { 
                    action: "create_committee_assignment", 
                    category: "access",
                    resourceType: "committee_member",
                    resourceId: newMember.id,
                    metadata: { target_user_id: userId, committee_id: committeeId }
                }
            );

            await sendSystemNotification(userId, "committee_assignment");
        }
    } else {
        // REMOVE
        if (existing) {
            const { error } = await supabase.from("committee_members").delete().eq("user_id", userId);
            if (error) throw error;

            await Logger.audit(
                { userId: session.user.id, req: request },
                { 
                    action: "delete_committee_assignment", 
                    category: "access",
                    resourceType: "committee_member",
                    resourceId: existing.id,
                    metadata: { target_user_id: userId, previous_committee_id: existing.committee_id }
                }
            );
        }
    }

    return NextResponse.json({ success: true });
});