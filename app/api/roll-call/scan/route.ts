import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { Logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTOTP } from "@/lib/otp";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const POST = apiHandler(async (request: Request) => {
    const auth = await getAuthorization({ requireAuth: true, requireApproved: true });
    if (!auth.ok || !auth.session) throw new Error("Unauthorized");
    const session = auth.session;

    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    await limiter.check(20, ip);

    const { token } = await request.json(); 

    if (!token) throw new Error("Token is required");

    let rollCallId = null;
    let otp = null;

    try {
        const parsed = JSON.parse(token);
        if (parsed.t === 'r' && parsed.id && parsed.otp) {
            rollCallId = parsed.id;
            otp = parsed.otp;
        } else {
            throw new Error("Invalid format");
        }
    } catch (e) {
        return NextResponse.json({ error: "This QR code is invalid or expired. Ask an organizer to refresh it." }, { status: 400 });
    }

    const { data: rollCall, error: rcError } = await supabase
        .from("roll_calls")
        .select("id, committee_id, session_name, secret_key")
        .eq("id", rollCallId)
        .single();

    if (rcError || !rollCall) {
        return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    if (!rollCall.secret_key) {
        return NextResponse.json({ error: "This session does not support secure verification. Create a new session." }, { status: 400 });
    }

    const isValid = await verifyTOTP(otp, rollCall.secret_key);
    if (!isValid) {
        return NextResponse.json({ error: "The QR code has expired. Refresh the screen and scan it again." }, { status: 400 });
    }

    const { data: membership } = await supabase
        .from("committee_members")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("committee_id", rollCall.committee_id)
        .maybeSingle();

    const isAdmin = session.user.role === ROLES.SUPERADMIN || session.user.role === ROLES.ADMIN;

    if (!membership && !isAdmin) {
        return NextResponse.json({ error: "This attendance session is not for your committee." }, { status: 403 });
    }

    const { data: existingLog } = await supabase
        .from("roll_call_logs")
        .select("id")
        .eq("roll_call_id", rollCall.id)
        .eq("user_id", session.user.id)
        .maybeSingle();

    if (existingLog) {
        return NextResponse.json({ error: "You have already recorded attendance for this session." }, { status: 409 });
    }

    const { error: insertError } = await supabase
        .from("roll_call_logs")
        .insert({
            roll_call_id: rollCall.id,
            user_id: session.user.id,
            scanned_at: new Date().toISOString()
        });

    if (insertError) throw insertError;

    await Logger.audit(
        { userId: session.user.id, req: request },
        { 
            action: "scan_roll_call", 
            category: "business",
            resourceType: "roll_call",
            resourceId: rollCall.id,
            metadata: { session: rollCall.session_name } 
        }
    );

    return NextResponse.json({ 
        success: true, 
        session_name: rollCall.session_name,
        message: "Attendance recorded successfully."
    });
});
