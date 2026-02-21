import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { personalDetailsSchema } from "@/types/application";

export const POST = apiHandler(async (req) => {
    const auth = await getAuthorization({ requireAuth: true });

    if (!auth.ok) {
        throw new Error(auth.message ?? "Unauthorized");
    }

    const userId = (auth.session as any).user.id;
    const userEmail = (auth.session as any).user.email;

    const body = await req.json();
    const { magiclink_id, personal_details } = body;

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
        .select("id, sent_to, delegation, used")
        .eq("id", magiclink_id)
        .maybeSingle();

    if (fetchError) {
        throw new Error(fetchError.message);
    }

    if (!magiclink || magiclink.used) {
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
    };

    if (parsed.data.manual_school_name) {
        detailsPayload.manual_school_name = parsed.data.manual_school_name;
    }

    const { data: existingDetails } = await supabase
        .from("user_details")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

    if (existingDetails) {
        const { error: detailsError } = await supabase
            .from("user_details")
            .update(detailsPayload)
            .eq("user_id", userId);

        if (detailsError) {
            throw new Error(detailsError.message);
        }
    } else {
        const { error: detailsError } = await supabase
            .from("user_details")
            .insert({ user_id: userId, ...detailsPayload });

        if (detailsError) {
            throw new Error(detailsError.message);
        }
    }

    // Mark magiclink as used
    const { error: updateError } = await supabase
        .from("delegation_magiclinks")
        .update({ used: true })
        .eq("id", magiclink_id);

    if (updateError) {
        throw new Error(updateError.message);
    }

    return NextResponse.json({ success: true });
});
