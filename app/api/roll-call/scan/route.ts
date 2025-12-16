import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";

export async function POST(request: Request) {
    const auth = await getAuthorization({ requireAuth: true });
    if (!auth.ok) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    const session = auth.session;

    try {
        const { token } = await request.json(); // The QR code string (UUID) 

        if (!token) {
            return NextResponse.json({ error: "Token is required" }, { status: 400 });
        }

        // 1. Find the Roll Call Session
        const { data: rollCall, error: rcError } = await supabase
            .from("roll_calls")
            .select("id, committee_id, session_name")
            .eq("qr_code", token)
            .single();

        if (rcError || !rollCall) {
            return NextResponse.json({ error: "Invalid QR Code or Session not found" }, { status: 404 });
        }

        // 2. Check User's Committee Membership
        // Admins and Chairmen might scan for testing, but typically this is for participants (applicants)
        // Strictly enforcing: User must be a member of the committee to be marked 'present'.
        
        const { data: membership, error: memError } = await supabase
            .from("committee_members")
            .select("id")
            .eq("user_id", session.user.id)
            .eq("committee_id", rollCall.committee_id)
            .maybeSingle();

        // Allow Admins/Superadmins to bypass membership check (optional, but good for testing)
        const isAdmin = session.user.role === 'superadmin' || session.user.role === 'admin';

        if (!membership && !isAdmin) {
            return NextResponse.json({ error: "Bu yoklama sizin komitenize ait değil." }, { status: 403 });
        }

        // 3. Check if already scanned
        const { data: existingLog, error: logError } = await supabase
            .from("roll_call_logs")
            .select("id")
            .eq("roll_call_id", rollCall.id)
            .eq("user_id", session.user.id)
            .maybeSingle();

        if (existingLog) {
            return NextResponse.json({ error: "Bu oturum için zaten yoklama verdiniz." }, { status: 409 });
        }

        // 4. Record Attendance
        const { error: insertError } = await supabase
            .from("roll_call_logs")
            .insert({
                roll_call_id: rollCall.id,
                user_id: session.user.id
            });

        if (insertError) throw insertError;

        return NextResponse.json({ 
            success: true, 
            session_name: rollCall.session_name,
            message: "Yoklama başarıyla alındı."
        });

    } catch (error) {
        console.error("Roll call scan error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
// Change Log:
// - Created new route to handle QR Code scanning.
// - Validates existence of the QR token.
// - Enforces committee membership rule (User must belong to the session's committee).
// - Enforces "scan once" rule via database check.