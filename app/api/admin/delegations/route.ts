import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

export const GET = apiHandler(async (request: Request) => {
    const auth = await getAuthorization({ 
        requireAuth: true, 
        allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] 
    });
    if (!auth.ok) throw new Error(auth.message);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from("delegations")
        .select(`
            id,
            name,
            created_at,
            leader:users!delegations_created_by_fkey (
                full_name,
                email,
                application:applications(status)
            ),
            members:delegation_members (count)
        `, { count: 'exact' });

    if (search) {
        query = query.or(`name.ilike.%${search}%,leader.full_name.ilike.%${search}%`, { foreignTable: 'leader' });
    }

    const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

    if (error) throw error;

    const formattedData = data.map((d: any) => ({
        id: d.id,
        name: d.name,
        created_at: d.created_at,
        leader: d.leader,
        member_count: d.members?.[0]?.count || 0,
        status: d.leader?.application?.[0]?.status || 'pending'
    }));

    return NextResponse.json({
        data: formattedData,
        meta: {
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit),
        }
    });
});