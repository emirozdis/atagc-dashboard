import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { personalDetailsSchema } from "@/types/application";
import { Logger } from "@/lib/logger";
import { sendSystemNotification } from "@/lib/notification-service";

export const POST = apiHandler(async (req) => {
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const auth = await getAuthorization({ requireAuth: true });

    if (!auth.ok) {
        throw new Error(auth.message ?? "Unauthorized");
    }

    const userId = (auth.session as any).user.id;
    const userEmail = (auth.session as any).user.email;

    const body = await req.json();
    const { magiclink_id, personal_details, form_id, form_data } = body;

    if (!magiclink_id || !personal_details) {
        return NextResponse.json(
            { error: "Validation Error", message: "magiclink_id and personal_details are required" },
            { status: 400 }
        );
    }

    // Validate personal details
    const parsed = personalDetailsSchema.safeParse(personal_details);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation Error", details: parsed.error.format() },
            { status: 400 }
        );
    }

    // Fetch and validate magiclink
    const { data: magiclink, error: fetchError } = await supabase
        .from("delegation_magiclinks")
        .select("id, sent_to, delegation, is_used")
        .eq("id", magiclink_id)
        .maybeSingle();

    if (fetchError) {
        throw new Error(fetchError.message);
    }

    if (!magiclink || magiclink.is_used) {
        return NextResponse.json(
            { error: "Bad Request", message: "Magic link is invalid or already used" },
            { status: 400 }
        );
    }

    // Email match check
    if (magiclink.sent_to.toLowerCase() !== userEmail.toLowerCase()) {
        return NextResponse.json(
            { error: "Forbidden", message: "Email does not match the magic link invitation" },
            { status: 403 }
        );
    }

    // Process Form Data & Map System Fields
    const finalFormData = form_data || {};
    const additionalInfo: Record<string, any> = {};

    if (form_id) {
        const { data: formTemplate } = await supabase
            .from("application_forms")
            .select("steps, slug")
            .eq("id", form_id)
            .single();

        if (formTemplate && Array.isArray(formTemplate.steps)) {
            formTemplate.steps.forEach((step: any) => {
                step.fields.forEach((field: any) => {
                    const val = finalFormData[field.id];
                    if (val !== undefined && field.system_map) {
                        if (!['phone_number', 'birth_date', 'city', 'grade', 'high_school_id'].includes(field.system_map)) {
                            additionalInfo[field.system_map] = val;
                        }
                    }
                });
            });
        }
    }

    if (parsed.data.manual_school_name) {
        additionalInfo.manual_school_name = parsed.data.manual_school_name;
    }

    additionalInfo.kvkk_approved = true;
    additionalInfo.kvkk_approved_at = new Date().toISOString();
    additionalInfo.kvkk_approved_ip = ip;

    // Check if user is already in this delegation
    const { data: existingMember } = await supabase
        .from("delegation_members")
        .select("id")
        .eq("user_id", userId)
        .eq("delegation", magiclink.delegation)
        .maybeSingle();

    if (!existingMember) {
        const { error: memberError } = await supabase
            .from("delegation_members")
            .insert({
                user_id: userId,
                delegation: magiclink.delegation,
                accepted: true,
            });

        if (memberError) {
            throw new Error(memberError.message);
        }
    }

    // Save personal details to user_details
    const detailsPayload: Record<string, any> = {
        phone_number: parsed.data.phone_number,
        birth_date: parsed.data.birth_date,
        city: parsed.data.city,
        grade: parsed.data.grade,
        high_school_id: parsed.data.high_school_id === -1 ? null : parsed.data.high_school_id,
        additional_info: additionalInfo
    };

    const { data: existingDetails } = await supabase
        .from("user_details")
        .select("id, additional_info")
        .eq("user_id", userId)
        .maybeSingle();

    if (existingDetails) {
        detailsPayload.additional_info = {
            ...(existingDetails.additional_info as object),
            ...additionalInfo
        };
        const { error: detailsError } = await supabase
            .from("user_details")
            .update(detailsPayload)
            .eq("user_id", userId);

        if (detailsError) throw new Error(detailsError.message);
    } else {
        const { error: detailsError } = await supabase
            .from("user_details")
            .insert({ user_id: userId, ...detailsPayload });

        if (detailsError) throw new Error(detailsError.message);
    }

    // Create Application Entry
    if (form_id) {
        const { data: existingApp } = await supabase
            .from("applications")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

        if (!existingApp) {
            const { data: newApp, error: appError } = await supabase
                .from("applications")
                .insert({
                    user_id: userId,
                    form_id: form_id,
                    form_data: finalFormData,
                    status: 'pending',
                    payment_status: 'unpaid',
                    submitted_at: new Date().toISOString()
                })
                .select("id")
                .single();

            if (appError) throw new Error(appError.message);

            await Logger.audit(
                { userId: userId, req: req },
                {
                    action: "submit_application",
                    category: "business",
                    resourceType: "application",
                    resourceId: newApp.id,
                    metadata: { form_id: form_id, context: "magiclink" }
                }
            );
            await sendSystemNotification(userId, "application_received");
        }
    }

    // Mark magiclink as used
    const { error: updateError } = await supabase
        .from("delegation_magiclinks")
        .update({ is_used: true })
        .eq("id", magiclink_id);

    if (updateError) {
        throw new Error(updateError.message);
    }

    return NextResponse.json({ success: true });
});