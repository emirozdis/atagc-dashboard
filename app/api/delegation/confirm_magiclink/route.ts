import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";

export const GET = apiHandler(async (req) => {
    const auth = await getAuthorization({ requireAuth: true });

    if (!auth.ok) {
        throw new Error(auth.message ?? "Unauthorized");
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
        return NextResponse.json(
            { error: "Validation Error", message: "id query parameter is required" },
            { status: 400 }
        );
    }

    const { data: magiclink, error: fetchError } = await supabase
        .from("delegation_magiclinks")
        .select("id, sent_to, used")
        .eq("id", id)
        .maybeSingle();

    if (fetchError) {
        throw new Error(fetchError.message);
    }

    if (!magiclink) {
        return NextResponse.json(
            { error: "Not Found", message: "Magic link not found" },
            { status: 404 }
        );
    }

    if (magiclink.used) {
        return NextResponse.json(
            { error: "Bad Request", message: "This magic link has already been used" },
            { status: 400 }
        );
    }

    const { error: updateError } = await supabase
        .from("delegation_magiclinks")
        .update({ used: true })
        .eq("id", id);

    if (updateError) {
        throw new Error(updateError.message);
    }

    return NextResponse.json({ success: true, email: magiclink.sent_to });
});