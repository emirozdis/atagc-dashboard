import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { z } from "zod";

const changeSchema = z.object({
    target_user_id: z.uuid(),
    action: z.enum(["accept", "reject", "remove"]),
});

export const POST = apiHandler(async (req) => {
    const auth = await getAuthorization({ requireAuth: true });

    if (!auth.ok) {
        throw new Error(auth.message ?? "Unauthorized");
    }

    if (!auth.session) throw new Error("Unauthorized");
    const userId = auth.session.user.id;

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

    const { target_user_id, action } = changeSchema.parse(await req.json());

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
    }

    return NextResponse.json({ success: true });
});
