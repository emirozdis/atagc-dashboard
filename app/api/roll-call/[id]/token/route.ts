import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { generateTOTP } from "@/lib/otp";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

export const GET = apiHandler(async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id } = await params;

    const auth = await getAuthorization({ 
        requireAuth: true, 
        allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.DEPUTY_CHAIR] 
    });
    if (!auth.ok || !auth.session) throw new Error("Unauthorized");
    const session = auth.session;

    const { data: rollCall, error } = await supabase
        .from("roll_calls")
        .select("id, committee_id, secret_key")
        .eq("id", id)
        .single();

    if (error || !rollCall) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (session.user.role !== ROLES.SUPERADMIN && session.user.role !== ROLES.ADMIN) {
            const { data: committee } = await supabase.from("committees").select("admin_id").eq("id", rollCall.committee_id).single();
            
            let isAuthorized = false;
            
            if (committee?.admin_id === session.user.id) {
                isAuthorized = true;
            } 
            else if (session.user.role === ROLES.DEPUTY_CHAIR) {
                const { data: member } = await supabase
                    .from("committee_members")
                    .select("id")
                    .eq("committee_id", rollCall.committee_id)
                    .eq("user_id", session.user.id)
                    .maybeSingle();
                
                if (member) isAuthorized = true;
            }

            if (!isAuthorized) {
                return NextResponse.json({ error: "Forbidden: Insufficient permissions to generate token." }, { status: 403 });
            }
    }

    if (!rollCall.secret_key) {
            return NextResponse.json({ error: "Legacy roll call (no secret)" }, { status: 400 });
    }

    const otp = await generateTOTP(rollCall.secret_key);
    
    const payload = JSON.stringify({
        t: 'r',
        id: rollCall.id,
        otp: otp
    });

    return NextResponse.json({ payload });
});