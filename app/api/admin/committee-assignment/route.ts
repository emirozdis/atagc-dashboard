import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { logAction } from "@/lib/logger";
import { sendSystemNotification } from "@/lib/notification-service";

export async function POST(request: Request) {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
  if (!auth.ok) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
  const session = auth.session;

  try {
    const { userId, committeeId } = await request.json();

    if (!userId) {
        return NextResponse.json({ error: "User ID missing" }, { status: 400 });
    }

    // 0. Check if target user is superadmin OR not a delegate
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

    if (targetUser.role === 'superadmin') {
        return NextResponse.json({ error: "Süper yöneticiler komiteye atanamaz." }, { status: 403 });
    }

    // --- RESTRICTION: Only Delegates can be assigned ---
    const app = Array.isArray(targetUser.application) ? targetUser.application[0] : targetUser.application;
    
    // Fix: Handle array or object structure for 'form'
    const formObj = Array.isArray(app?.form) ? app.form[0] : app?.form;
    const applicantType = formObj?.slug;

    if (committeeId && applicantType !== 'delegate' && targetUser.role === 'applicant') {
        return NextResponse.json({ error: "Sadece DELEGE rolündeki katılımcılar komiteye atanabilir." }, { status: 403 });
    }
    // ----------------------------------------------------

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

        // NOTIFICATION: Committee Assignment
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
  } catch (error) {
    console.error("Assignment error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Change Log:
// - Fixed TypeScript error by safely checking if `app.form` is an array or object before accessing `.slug`.