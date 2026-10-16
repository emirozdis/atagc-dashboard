import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { HttpError } from "@/lib/http-error";
import { z } from "zod";

const changeSchema = z.object({
    target_user_id: z.uuid(),
    action: z.enum(["accept", "reject", "remove"]),
    delegationId: z.uuid().optional(),
});

type DelegationRow = { id: string; name?: string | null };

// a leader may own several delegations, so the row being managed has to be resolved explicitly:
// the requested one when supplied, otherwise the most recent delegation the user leads
async function resolveManagedDelegation(userId: string, requestedId?: string) {
    const { data, error } = await supabase
        .from("delegations")
        .select("id, name")
        .or(`owner_id.eq.${userId},created_by.eq.${userId}`)
        .order("created_at", { ascending: false });

    if (error) throw new HttpError(500, "Unable to load your delegations.");

    const delegations = (data || []) as unknown as DelegationRow[];

    if (requestedId) {
        const requested = delegations.find((row) => row.id === requestedId);
        if (!requested) throw new HttpError(404, "Delegation not found.");
        return requested;
    }

    const [latest] = delegations;
    if (!latest) throw new HttpError(403, "You are not a delegation leader");

    return latest;
}

export const POST = apiHandler(async (req) => {
    const auth = await getAuthorization({ requireAuth: true });

    if (!auth.ok) {
        throw new Error(auth.message ?? "Unauthorized");
    }

    if (!auth.session) throw new Error("Unauthorized");
    const userId = auth.session.user.id;

    const { target_user_id, action, delegationId } = changeSchema.parse(await req.json());

    const delegation = await resolveManagedDelegation(userId, delegationId);

    // membership rows carry the delegation in either the real or the legacy column, so both are matched
    const { data: members, error: memberError } = await supabase
        .from("delegation_members")
        .select("user_id")
        .eq("user_id", target_user_id)
        .or(`delegation_id.eq.${delegation.id},delegation.eq.${delegation.id}`)
        .order("joined_at", { ascending: false })
        .limit(1);

    if (memberError) throw new HttpError(500, "Unable to load delegation members.");

    const member = (members || [])[0] as { user_id?: string } | undefined;
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
            .or(`delegation_id.eq.${delegation.id},delegation.eq.${delegation.id}`);

        if (error) throw new HttpError(500, error.message || "Unable to remove the member.");
    } else {
        const { error } = await supabase
            .from("delegation_members")
            .update({ accepted: action === "accept" })
            .eq("user_id", target_user_id)
            .or(`delegation_id.eq.${delegation.id},delegation.eq.${delegation.id}`);

        if (error) throw new HttpError(500, error.message || "Unable to update the member.");
    }

    return NextResponse.json({ success: true, delegation_id: delegation.id });
});