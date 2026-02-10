import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";
import { getSignedUrl } from "@/lib/storage-utils";

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

    const { data: user, error } = await supabase
        .rpc('get_admin_user_profile', { p_user_id: id });

    if (error) {
        console.error("RPC Error:", error);
        throw new Error("Failed to fetch user profile");
    }

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.user_details && user.user_details.profile_picture_url) {
        user.user_details.profile_picture_url = await getSignedUrl(
            "profile-pictures", 
            user.user_details.profile_picture_url
        );
    }

    return NextResponse.json(user);
});