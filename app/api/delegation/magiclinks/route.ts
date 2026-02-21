import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";

export const GET = apiHandler(async () => {
    const auth = await getAuthorization({ requireAuth: true });
    if (!auth.ok || !auth.session) throw new Error(auth.message || "Unauthorized");

    const userId = auth.session.user.id;

    // Get delegation
    const { data: delegation } = await supabase
        .from("delegations")
        .select("id")
        .eq("created_by", userId)
        .single();

    if (!delegation) throw new Error("Delegasyon bulunamadı.");

    const { data } = await supabase
        .from("delegation_magiclinks")
        .select("*")
        .eq("delegation", delegation.id)
        .order("created_at", { ascending: false });

    return NextResponse.json({ data: data || [] });
});

export const DELETE = apiHandler(async (req) => {
    const auth = await getAuthorization({ requireAuth: true });
    // Explicitly check for auth.session to satisfy TypeScript
    if (!auth.ok || !auth.session) throw new Error(auth.message || "Unauthorized");

    const userId = auth.session.user.id;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) throw new Error("ID required");

    // Verify ownership via delegation
    const { data: delegation } = await supabase
        .from("delegations")
        .select("id")
        .eq("created_by", userId)
        .single();

    if (!delegation) throw new Error("Delegasyon bulunamadı.");

    // Only allow deleting unused links or force delete if needed
    const { error } = await supabase
        .from("delegation_magiclinks")
        .delete()
        .eq("id", id)
        .eq("delegation", delegation.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
});