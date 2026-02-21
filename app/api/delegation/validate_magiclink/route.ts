import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { apiHandler } from "@/lib/api-handler";

export const GET = apiHandler(async (req) => {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
        return NextResponse.json(
            { valid: false, error: "id query parameter is required" },
            { status: 400 }
        );
    }

    const { data: magiclink, error: fetchError } = await supabase
        .from("delegation_magiclinks")
        .select("id, sent_to, delegation, used")
        .eq("id", id)
        .maybeSingle();

    if (fetchError) {
        throw new Error(fetchError.message);
    }

    if (!magiclink || magiclink.used) {
        return NextResponse.json({ valid: false });
    }

    return NextResponse.json({
        valid: true,
        email: magiclink.sent_to,
        delegation_id: magiclink.delegation,
    });
});
