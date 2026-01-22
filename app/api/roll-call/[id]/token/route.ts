import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { generateTOTP } from "@/lib/otp";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // Auth Check: Must be Chairman, Deputy or Admin
    const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin", "committee_chairman", "deputy_chair"] });
    if (!auth.ok || !auth.session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = auth.session;

    try {
        // 1. Fetch Roll Call Secret
        const { data: rollCall, error } = await supabase
            .from("roll_calls")
            .select("id, committee_id, secret_key")
            .eq("id", id)
            .single();

        if (error || !rollCall) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        // 2. Authorization: Check if user has rights to this committee
        if (session.user.role !== 'superadmin' && session.user.role !== 'admin') {
             const { data: committee } = await supabase.from("committees").select("admin_id").eq("id", rollCall.committee_id).single();
             
             let isAuthorized = false;
             if (committee?.admin_id === session.user.id) isAuthorized = true;
             else {
                 const { data: member } = await supabase.from("committee_members").select("id").eq("committee_id", rollCall.committee_id).eq("user_id", session.user.id).maybeSingle();
                 if (member) isAuthorized = true;
             }

             if (!isAuthorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (!rollCall.secret_key) {
             return NextResponse.json({ error: "Legacy roll call (no secret)" }, { status: 400 });
        }

        // 3. Generate Token (Server-side)
        const otp = await generateTOTP(rollCall.secret_key);
        
        // 4. Construct Payload
        const payload = JSON.stringify({
            t: 'r',
            id: rollCall.id,
            otp: otp
        });

        return NextResponse.json({ payload });

    } catch (e) {
        console.error("Token gen error:", e);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}

// Change Log:
// - New endpoint to generate dynamic QR payload server-side.
// - Prevents exposing `secret_key` to the client.