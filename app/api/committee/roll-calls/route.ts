import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export async function GET(request: Request) {
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    try {
        await limiter.check(60, ip);
    } catch {
        return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
    }

    const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["committee_chairman", "deputy_chair"] });
    if (!auth.ok || !auth.session) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    const session = auth.session;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    let committeeId: string | null = null;

    // Find the committee managed by this user
    const { data: adminCommittee } = await supabase.from("committees").select("id").eq("admin_id", session.user.id).maybeSingle();
    if (adminCommittee) committeeId = adminCommittee.id;
    else {
        const { data: memberCommittee } = await supabase.from("committee_members").select("committee_id").eq("user_id", session.user.id).maybeSingle();
        if (memberCommittee) committeeId = memberCommittee.committee_id;
    }

    if (!committeeId) return NextResponse.json({ error: "Committee not found" }, { status: 404 });

    // Get total count for pagination
    const { count, error: countError } = await supabase
        .from("roll_calls")
        .select("*", { count: "exact", head: true })
        .eq("committee_id", committeeId);

    if (countError) return NextResponse.json({ error: "Failed to fetch count" }, { status: 500 });

    // Get paginated roll calls with attendance count
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

    if (fetchError) return NextResponse.json({ error: "Failed to fetch roll calls" }, { status: 500 });

    // Get total members count to calculate rate
    const { count: totalMembers } = await supabase
        .from("committee_members")
        .select("*", { count: "exact", head: true })
        .eq("committee_id", committeeId);

    const formattedRollCalls = rollCalls.map((rc: any) => ({
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
}
