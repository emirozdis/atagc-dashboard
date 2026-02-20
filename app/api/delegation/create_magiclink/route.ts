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

    const body = await req.json().catch(() => ({}));
    const sentTo = body.sent_to;

    if (!sentTo || typeof sentTo !== "string") {
        return NextResponse.json(
            { error: "Validation Error", message: "sent_to is required" },
            { status: 400 }
        );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sentTo)) {
        return NextResponse.json(
            { error: "Validation Error", message: "sent_to must be a valid email address" },
            { status: 400 }
        );
    }

    // Insert into delegation_magiclinks
    const { data, error } = await supabase
        .from("delegation_magiclinks")
        .insert({ delegation: delegation.id, sent_to: sentTo })
        .select("id")
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return NextResponse.json({ success: true, id: data.id });
});