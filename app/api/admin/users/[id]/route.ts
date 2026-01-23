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
        allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.DEPUTY_CHAIR] 
    });
    if (!auth.ok || !auth.session) throw new Error(auth.message);
    const session = auth.session;
    const { id } = await params;

    if (session.user.role === ROLES.CHAIRMAN || session.user.role === ROLES.DEPUTY_CHAIR) {
        const { data: relation } = await supabase
            .from("committee_members")
            .select("committee_id")
            .eq("user_id", id)
            .maybeSingle();
        
        const targetCommitteeId = relation?.committee_id;
        
        let adminCommitteeId = null;
        const { data: managed } = await supabase.from("committees").select("id").eq("admin_id", session.user.id).maybeSingle();
        if (managed) adminCommitteeId = managed.id;
        else {
             const { data: membership } = await supabase.from("committee_members").select("committee_id").eq("user_id", session.user.id).maybeSingle();
             adminCommitteeId = membership?.committee_id;
        }

        if (!targetCommitteeId || targetCommitteeId !== adminCommitteeId) {
             return NextResponse.json({ error: "Bu kullanıcı sizin komitenizde değil." }, { status: 403 });
        }
    }

    const { data, error } = await supabase
        .from("v_full_user_profiles")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(data);
});