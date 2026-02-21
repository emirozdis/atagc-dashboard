import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";

export const POST = apiHandler(async (req) => {
    const auth = await getAuthorization({ requireAuth: true });

    if (!auth.ok) {
        throw new Error(auth.message ?? "Unauthorized");
    }

    const userId = (auth.session as any).user.id;

    // Check if the user is a delegation leader
    const { data: delegation, error: delegationError } = await supabase
        .from("delegations")
        .select("id")
        .eq("created_by", userId)
        .single();

    if (delegationError || !delegation) {
        return NextResponse.json(
            { error: "Forbidden", message: "You are not a delegation leader" },
            { status: 403 }
        );
    }

    const { target_user_id, action } = await req.json();

    if (!target_user_id || !action) {
        return NextResponse.json(
            { error: "Validation Error", message: "target_user_id and action are required" },
            { status: 400 }
        );
    }

    if (!["accept", "reject", "remove"].includes(action)) {
        return NextResponse.json(
            { error: "Validation Error", message: "action must be accept, reject, or remove" },
            { status: 400 }
        );
    }

    // Check if target user is in the same delegation
    const { data: member } = await supabase
        .from("delegation_members")
        .select("user_id")
        .eq("user_id", target_user_id)
        .eq("delegation", delegation.id)
        .maybeSingle();

    if (!member) {
        return NextResponse.json(
            { error: "Forbidden", message: "Target user is not in your delegation" },
            { status: 403 }
        );
    }

    if (action === "remove") {
        const { error } = await supabase
            .from("delegation_members")
            .delete()
            .eq("user_id", target_user_id)
            .eq("delegation", delegation.id);

        if (error) throw new Error(error.message);
    } else {
        const { error } = await supabase
            .from("delegation_members")
            .update({ accepted: action === "accept" })
            .eq("user_id", target_user_id)
            .eq("delegation", delegation.id);

        if (error) throw new Error(error.message);

        // Create application when accepting a member
        if (action === "accept") {
            const { data: delegateForm } = await supabase
                .from("application_forms")
                .select("id")
                .eq("slug", "delegate")
                .eq("is_active", true)
                .single();

            if (delegateForm) {
                const { error: appError } = await supabase
                    .from("applications")
                    .insert({
                        user_id: target_user_id,
                        form_id: delegateForm.id,
                        form_data: {},
                        status: "pending",
                        payment_status: "unpaid",
                        submitted_at: new Date().toISOString(),
                    });

                if (appError) throw new Error(appError.message);
            }
        }
    }

    return NextResponse.json({ success: true });
});