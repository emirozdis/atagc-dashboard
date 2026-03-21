import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

export const GET = apiHandler(async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) => {
    const auth = await getAuthorization({ 
        requireAuth: true, 
        allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] 
    });
    if (!auth.ok) throw new Error(auth.message);

    const { id } = await params;

    const { data: d, error } = await supabase
        .from("delegations")
        .select(`
            id,
            name,
            created_at,
            leader:users!delegations_created_by_fkey (
                id,
                full_name,
                email,
                application:applications(id, status),
                user_details (
                    phone_number,
                    high_schools(school_name),
                    additional_info
                )
            ),
            members:delegation_members (
                user_id,
                accepted,
                joined_at,
                user:users (
                    id,
                    full_name,
                    email,
                    role,
                    application:applications(id, status)
                )
            )
        `)
        .eq("id", id)
        .single();

    if (error || !d) throw new Error("Delegasyon bulunamadı");

    const leaderRaw = d.leader as any;
    const leader = Array.isArray(leaderRaw) ? leaderRaw[0] : leaderRaw;
    const leaderApp = Array.isArray(leader?.application) ? leader.application[0] : leader?.application;

    const formattedData = {
        id: d.id,
        name: d.name,
        created_at: d.created_at,
        leader: leader,
        leader_application_id: leaderApp?.id || null,
        status: leaderApp?.status || 'pending',
        member_count: d.members?.length || 0,
        members: (d.members || []).map((m: any) => {
            const memberUser = m.user;
            const memberApp = Array.isArray(memberUser?.application) ? memberUser.application[0] : memberUser?.application;
            
            return {
                id: m.user_id,
                full_name: memberUser?.full_name,
                email: memberUser?.email,
                role: memberUser?.role,
                accepted: m.accepted,
                joined_at: m.joined_at,
                application_id: memberApp?.id || null,
                application_status: memberApp?.status || 'no_application'
            };
        })
    };

    return NextResponse.json(formattedData);
});