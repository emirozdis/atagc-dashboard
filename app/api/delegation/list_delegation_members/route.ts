import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { HttpError } from "@/lib/http-error";

type DelegationRow = { id: string };
type MembershipRow = { delegation_id?: string | null; delegation?: string | null };

export const GET = apiHandler(async (request: Request) => {
    const auth = await getAuthorization({ requireAuth: true });

    if (!auth.ok) {
        throw new Error(auth.message ?? "Unauthorized");
    }

    if (!auth.session) throw new Error("Unauthorized");
    const userId = auth.session.user.id;
    const requestedId = new URL(request.url).searchParams.get("delegationId");
    let delegationId: string | null = null;
    let isLeader = false;

    // a leader may run several delegations and a member may sit in several of them, so both
    // lookups are lists ordered newest first and database failures are surfaced instead of ignored
    const [{ data: ownedRows, error: ownedError }, { data: membershipRows, error: membershipError }] = await Promise.all([
        supabase
            .from("delegations")
            .select("id, created_at")
            .or(`owner_id.eq.${userId},created_by.eq.${userId}`)
            .order("created_at", { ascending: false }),
        supabase
            .from("delegation_members")
            .select("delegation_id, delegation, joined_at")
            .eq("user_id", userId)
            .order("joined_at", { ascending: false }),
    ]);

    if (ownedError || membershipError) throw new HttpError(500, "Unable to load your delegations.");

    const owned = (ownedRows || []) as unknown as DelegationRow[];
    const memberships = (membershipRows || []) as unknown as MembershipRow[];

    if (requestedId) {
        // an explicitly requested delegation has to be one the user actually leads or belongs to
        if (owned.some((row) => row.id === requestedId)) {
            delegationId = requestedId;
            isLeader = true;
        } else if (memberships.some((row) => row.delegation_id === requestedId || row.delegation === requestedId)) {
            delegationId = requestedId;
        } else {
            throw new HttpError(403, "You do not have access to this delegation.");
        }
    } else if (owned[0]) {
        delegationId = owned[0].id;
        isLeader = true;
    } else {
        // the legacy column is populated on some rows only, so either one identifies the delegation
        const membership = memberships.find((row) => row.delegation_id || row.delegation);
        delegationId = membership?.delegation_id || membership?.delegation || null;
    }

    if (!delegationId) {
        return NextResponse.json({ success: true, data: [], is_leader: false, has_delegation: false });
    }

    const { data, error } = await supabase
        .from("delegation_members")
        .select("user_id, joined_at, accepted, users:user_id(full_name, email, application:applications(status))")
        .or(`delegation_id.eq.${delegationId},delegation.eq.${delegationId}`)
        .order("joined_at", { ascending: true });

    if (error) throw new HttpError(500, error.message || "Unable to load delegation members.");

    return NextResponse.json({ success: true, data: data || [], is_leader: isLeader, has_delegation: true });
});