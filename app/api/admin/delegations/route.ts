import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";
import { parsePagination } from "@/lib/pagination";

type DelegationListRow = {
    id: string;
    name: string;
    application_id?: string | null;
    created_at: string;
    leader?: { full_name?: string; email?: string; application?: Array<{ status?: string }> } | Array<{ full_name?: string; email?: string; application?: Array<{ status?: string }> }> | null;
    members?: Array<{ count?: number }>;
};

export const GET = apiHandler(async (request: Request) => {
    const auth = await getAuthorization({ 
        requireAuth: true, 
        allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] 
    });
    if (!auth.ok) throw new Error(auth.message);

    const { searchParams } = new URL(request.url);
    const { page, limit, from, to } = parsePagination(searchParams, { defaultLimit: 10, maxLimit: 100 });
    const search = searchParams.get("search") || "";

    let query = supabase
        .from("delegations")
        .select(`
            id,
            name,
            application_id,
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

    const rows = data as unknown as DelegationListRow[];
    const applicationIds = rows.map((delegation) => delegation.application_id).filter((id): id is string => !!id);
    const { data: linkedApplications, error: linkedApplicationsError } = applicationIds.length
        ? await supabase.from("applications").select("id, status").in("id", applicationIds)
        : { data: [], error: null };
    if (linkedApplicationsError) throw linkedApplicationsError;
    const statusesByApplicationId = new Map((linkedApplications || []).map((application) => [application.id, application.status]));

    const formattedData = rows.map((d) => ({
        id: d.id,
        name: d.name,
        created_at: d.created_at,
        leader: d.leader,
        member_count: d.members?.[0]?.count || 0,
        status: (d.application_id ? statusesByApplicationId.get(d.application_id) : null)
            || (Array.isArray(d.leader) ? d.leader[0]?.application?.[0]?.status : d.leader?.application?.[0]?.status)
            || 'pending'
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
