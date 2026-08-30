import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { rateLimit } from "@/lib/rate-limit";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const GET = apiHandler(async (request: Request) => {
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    await limiter.check(60, ip);

    const auth = await getAuthorization({ 
        requireAuth: true, 
        allowedRoles: [ROLES.CHAIRMAN, ROLES.DEPUTY_CHAIR] 
    });
    if (!auth.ok || !auth.session) throw new Error(auth.message);
    const session = auth.session;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    let committeeId: string | null = null;

    const { data: adminCommittee } = await supabase.from("committees").select("id").eq("admin_id", session.user.id).maybeSingle();
    if (adminCommittee) committeeId = adminCommittee.id;
    else {
        const { data: memberCommittee } = await supabase.from("committee_members").select("committee_id").eq("user_id", session.user.id).maybeSingle();
        if (memberCommittee) committeeId = memberCommittee.committee_id;
    }

    if (!committeeId) return NextResponse.json({ error: "Committee not found" }, { status: 404 });

    const { count, error: countError } = await supabase
        .from("roll_calls")
        .select("*", { count: "exact", head: true })
        .eq("committee_id", committeeId);

    if (countError) throw countError;

    const { data: rollCalls, error: fetchError } = await supabase
        .from("roll_calls")
        .select(`
      id,
      session_name,
      created_at,
      roll_call_logs(count)
    `)
        .eq("committee_id", committeeId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (fetchError) throw fetchError;

    const { count: totalMembers } = await supabase
        .from("committee_members")
        .select("*", { count: "exact", head: true })
        .eq("committee_id", committeeId);

    const formattedRollCalls = rollCalls.map((rc) => ({
        id: rc.id,
        session_name: rc.session_name,
        created_at: rc.created_at,
        attendance_count: rc.roll_call_logs?.[0]?.count || 0,
        total_members: totalMembers || 0,
        attendance_rate: totalMembers && totalMembers > 0 ? Math.round(((rc.roll_call_logs?.[0]?.count || 0) / totalMembers) * 100) : 0
    }));

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
        data: formattedRollCalls,
        meta: {
            page,
            limit,
            totalCount: count || 0,
            totalPages
        }
    });
});
