import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { rateLimit } from "@/lib/rate-limit";
import { apiHandler } from "@/lib/api-handler";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const GET = apiHandler(async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) => {
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    await limiter.check(30, ip);

    const auth = await getAuthorization({ requireAuth: true });
    if (!auth.ok) throw new Error("Unauthorized");

    const { id } = await params;

    const { data: rollCall, error: rcError } = await supabase
        .from("roll_calls")
        .select("committee_id")
        .eq("id", id)
        .single();

    if (rcError || !rollCall) {
        return NextResponse.json({ error: "Roll call not found" }, { status: 404 });
    }

    const { count: scannedCount, error: scanError } = await supabase
        .from("roll_call_logs")
        .select("*", { count: 'exact', head: true })
        .eq("roll_call_id", id);

    if (scanError) throw scanError;

    const { count: memberCount, error: memberError } = await supabase
        .from("committee_members")
        .select("*", { count: 'exact', head: true })
        .eq("committee_id", rollCall.committee_id);

    if (memberError) throw memberError;

    return NextResponse.json({
        scanned: scannedCount || 0,
        total: memberCount || 0
    });
});