import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60000 });

export const POST = apiHandler(async (req) => {
    const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
    await limiter.check(10, ip);

    const auth = await getAuthorization({ requireAuth: true });

    if (!auth.ok) {
        throw new Error(auth.message ?? "Unauthorized");
    }

    const userId = (auth.session as any).user.id;

    const { data: delegation, error: delegationError } = await supabase
        .from("delegations")
        .select("id")
        .eq("created_by", userId)
        .single();

    if (delegationError || !delegation) {
        throw new Error("Forbidden: You have not created a delegation");
    }

    const body = await req.json().catch(() => ({}));
    const insertData: Record<string, any> = { delegation: delegation.id };

    if (body.uses_left !== undefined) {
        const usesLeft = Number(body.uses_left);
        if (!Number.isInteger(usesLeft) || usesLeft <= 0) {
            return NextResponse.json(
                { error: "Validation Error", message: "uses_left must be a positive integer" },
                { status: 400 }
            );
        }
        insertData.uses_left = usesLeft;
    }

    const { data, error } = await supabase
        .from("delegation_invites")
        .insert(insertData)
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return NextResponse.json({ success: true, data });
});
