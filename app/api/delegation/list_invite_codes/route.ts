import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

export const GET = apiHandler(async () => {
    const auth = await getAuthorization({ requireAuth: true });

    if (!auth.ok) {
        throw new Error(auth.message ?? "Unauthorized");
    }

    const session = auth.session as any;
    const role = session.user.role;

    // Admins/superadmins can see all invite codes
    if (role === ROLES.ADMIN || role === ROLES.SUPERADMIN) {
        const { data, error } = await supabase
            .from("delegation_invites")
            .select("invite_code, delegation, uses_left, created_at")
            .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);
        return NextResponse.json({ success: true, data });
    }

    // Non-admins can only see invite codes for their own delegation
    const { data: delegation, error: delegationError } = await supabase
        .from("delegations")
        .select("id")
        .eq("created_by", session.user.id)
        .single();

    if (delegationError || !delegation) {
        throw new Error("Forbidden: You have not created a delegation");
    }

    const { data, error } = await supabase
        .from("delegation_invites")
        .select("invite_code, delegation, uses_left, created_at")
        .eq("delegation", delegation.id)
        .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, data });
});