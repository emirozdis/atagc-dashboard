import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";

export const GET = apiHandler(async () => {
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

    // List all members of their delegation with user details
    const { data, error } = await supabase
        .from("delegation_members")
        .select("user_id, joined_at, accepted, users:user_id(full_name, email)")
        .eq("delegation", delegation.id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, data });
});