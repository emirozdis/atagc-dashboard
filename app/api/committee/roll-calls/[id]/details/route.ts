import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { rateLimit } from "@/lib/rate-limit";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const GET = apiHandler(async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) => {
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    await limiter.check(60, ip);

    const { id } = await params;

    const auth = await getAuthorization({ 
        requireAuth: true, 
        allowedRoles: [ROLES.CHAIRMAN, ROLES.DEPUTY_CHAIR] 
    });
    if (!auth.ok || !auth.session) throw new Error(auth.message);
    const session = auth.session;

    const { data: rollCall, error: rcError } = await supabase
        .from("roll_calls")
        .select("id, committee_id, session_name, created_at")
        .eq("id", id)
        .single();

    if (rcError || !rollCall) {
        return NextResponse.json({ error: "Roll call not found" }, { status: 404 });
    }

    const { data: committee } = await supabase
        .from("committees")
        .select("id, admin_id")
        .eq("id", rollCall.committee_id)
        .maybeSingle();

    const isOwner = committee?.admin_id === session.user.id;

    let isDeputy = false;
    if (!isOwner) {
        const { data: membership } = await supabase
            .from("committee_members")
            .select("id")
            .eq("committee_id", rollCall.committee_id)
            .eq("user_id", session.user.id)
            .maybeSingle();

        if (membership && session.user.role === ROLES.DEPUTY_CHAIR) {
            isDeputy = true;
        }
    }

    if (!isOwner && !isDeputy) {
        return NextResponse.json({ error: "Unauthorized access to this committee's data" }, { status: 403 });
    }

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
});