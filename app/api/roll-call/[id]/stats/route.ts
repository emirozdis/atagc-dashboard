import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await getAuthorization({ requireAuth: true });
    if (!auth.ok) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    const session = auth.session;

    try {
        const { id } = await params;

        // 1. Get roll call to find committee_id
        const { data: rollCall, error: rcError } = await supabase
            .from("roll_calls")
            .select("committee_id")
            .eq("id", id)
            .single();

        if (rcError || !rollCall) {
            return NextResponse.json({ error: "Roll call not found" }, { status: 404 });
        }

        // 2. Count scans (attendance)
        const { count: scannedCount, error: scanError } = await supabase
            .from("roll_call_logs")
            .select("*", { count: 'exact', head: true })
            .eq("roll_call_id", id);

        if (scanError) throw scanError;

        // 3. Count total committee members
        const { count: memberCount, error: memberError } = await supabase
            .from("committee_members")
            .select("*", { count: 'exact', head: true })
            .eq("committee_id", rollCall.committee_id);

        if (memberError) throw memberError;

        return NextResponse.json({
            scanned: scannedCount || 0,
            total: memberCount || 0
        });

    } catch (error) {
        console.error("Stats error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
// Change Log:
// - Created new endpoint to fetch real-time statistics (scanned vs total members) for a specific roll call session.