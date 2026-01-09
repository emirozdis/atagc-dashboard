import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    try {
        await limiter.check(60, ip);
    } catch {
        return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
    }

    const { id } = await params;

    const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["committee_chairman", "deputy_chair"] });
    if (!auth.ok || !auth.session) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    const session = auth.session;

    try {
        // 1. Get roll call and verify it's managed by the current user
        const { data: rollCall, error: rcError } = await supabase
            .from("roll_calls")
            .select("id, committee_id, session_name, created_at")
            .eq("id", id)
            .single();

        if (rcError || !rollCall) {
            return NextResponse.json({ error: "Roll call not found" }, { status: 404 });
        }

        // Authorization check: Verify if the user manages this committee
        const { data: committee } = await supabase
            .from("committees")
            .select("id, admin_id")
            .eq("id", rollCall.committee_id)
            .maybeSingle();

        const isOwner = committee?.admin_id === session.user.id;

        // If not owner, check if they are a deputy chair of this committee
        let isDeputy = false;
        if (!isOwner) {
            const { data: membership } = await supabase
                .from("committee_members")
                .select("id")
                .eq("committee_id", rollCall.committee_id)
                .eq("user_id", session.user.id)
                .maybeSingle();

            if (membership && session.user.role === 'deputy_chair') {
                isDeputy = true;
            }
        }

        if (!isOwner && !isDeputy) {
            return NextResponse.json({ error: "Unauthorized access to this committee's data" }, { status: 403 });
        }

        // 2. Fetch all committee members
        const { data: members, error: membersError } = await supabase
            .from("committee_members")
            .select(`
                id,
                user_id,
                user:users (
                    id,
                    full_name,
                    email,
                    role
                )
            `)
            .eq("committee_id", rollCall.committee_id);

        if (membersError) throw membersError;

        // 3. Fetch all attendance logs for this roll call
        const { data: logs, error: logsError } = await supabase
            .from("roll_call_logs")
            .select("user_id, scanned_at")
            .eq("roll_call_id", id);

        if (logsError) throw logsError;

        const attendedUserIds = new Set(logs.map(l => l.user_id));
        const logsMap = new Map(logs.map(l => [l.user_id, l.scanned_at]));

        const detailedMembers = members.map((m: any) => {
            const u = Array.isArray(m.user) ? m.user[0] : m.user;
            return {
                id: m.id,
                userId: u.id,
                full_name: u.full_name,
                email: u.email,
                role: u.role,
                present: attendedUserIds.has(u.id),
                scanned_at: logsMap.get(u.id) || null
            };
        });

        // Sort: Present first, then by name
        detailedMembers.sort((a, b) => {
            if (a.present === b.present) {
                return a.full_name.localeCompare(b.full_name);
            }
            return a.present ? -1 : 1;
        });

        return NextResponse.json({
            rollCall,
            members: detailedMembers
        });

    } catch (error) {
        console.error("Roll call details error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
