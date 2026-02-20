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

    // Check if the user is already in a delegation
    const { data: existingMember, error: memberError } = await supabase
        .from("delegation_members")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

    if (memberError) {
        throw new Error(memberError.message);
    }

    if (existingMember) {
        return NextResponse.json(
            { error: "Bad Request", message: "You are already in a delegation" },
            { status: 400 }
        );
    }

    // Validate invite code from request body
    const body = await req.json().catch(() => ({}));
    const inviteCode = body.invite_code;

    if (!inviteCode) {
        return NextResponse.json(
            { error: "Validation Error", message: "invite_code is required" },
            { status: 400 }
        );
    }

    // Look up the invite code
    const { data: invite, error: inviteError } = await supabase
        .from("delegation_invites")
        .select("invite_code, delegation, uses_left")
        .eq("invite_code", inviteCode)
        .maybeSingle();

    if (inviteError) {
        throw new Error(inviteError.message);
    }

    if (!invite) {
        return NextResponse.json(
            { error: "Forbidden", message: "Invalid invite code" },
            { status: 403 }
        );
    }

    // Check if there are uses left
    if (invite.uses_left !== null && invite.uses_left <= 0) {
        return NextResponse.json(
            { error: "Bad Request", message: "This invite code has no uses left" },
            { status: 400 }
        );
    }

    // Decrement uses_left
    if (invite.uses_left !== null) {
        const { error: updateError } = await supabase
            .from("delegation_invites")
            .update({ uses_left: invite.uses_left - 1 })
            .eq("invite_code", inviteCode);

        if (updateError) {
            throw new Error(updateError.message);
        }
    }

    // Insert user into delegation_members
    const { data, error: insertError } = await supabase
        .from("delegation_members")
        .insert({ user_id: userId, delegation: invite.delegation })
        .select()
        .single();

    if (insertError) {
        throw new Error(insertError.message);
    }

    return NextResponse.json({ success: true, data });
});