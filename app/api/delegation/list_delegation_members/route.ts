import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";

export const GET = apiHandler(async () => {
    const auth = await getAuthorization({ requireAuth: true });

    if (!auth.ok) {
        throw new Error(auth.message ?? "Unauthorized");
    }

    if (!auth.session) throw new Error("Unauthorized");
    const userId = auth.session.user.id;
    let delegationId = null;
    let isLeader = false;

    // 1. Check if user is a leader
    const { data: ownedDelegation } = await supabase
        .from("delegations")
        .select("id")
        .eq("created_by", userId)
        .maybeSingle();

    if (ownedDelegation) {
        delegationId = ownedDelegation.id;
        isLeader = true;
    } else {
        // 2. Check if user is a member
        const { data: membership } = await supabase
            .from("delegation_members")
            .select("delegation")
            .eq("user_id", userId)
            .maybeSingle();
        
        if (membership) {
            delegationId = membership.delegation;
        }
    }

    if (!delegationId) {
        return NextResponse.json({ success: true, data: [], is_leader: false, has_delegation: false });
    }

    const { data, error } = await supabase
        .from("delegation_members")
        .select("user_id, joined_at, accepted, users:user_id(full_name, email, application:applications(status))")
        .eq("delegation", delegationId);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, data, is_leader: isLeader, has_delegation: true });
});
