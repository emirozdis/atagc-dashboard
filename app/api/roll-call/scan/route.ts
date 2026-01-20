import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { logAction } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTOTP } from "@/lib/otp";

// Rate limit: 20 scans per minute per IP
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export async function POST(request: Request) {
    // Enforce Approved status for scanning
    const auth = await getAuthorization({ requireAuth: true, requireApproved: true });
    if (!auth.ok || !auth.session) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    const session = auth.session;

    try {
        const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
        await limiter.check(20, ip);

        const { token } = await request.json(); 

        if (!token) {
            return NextResponse.json({ error: "Token is required" }, { status: 400 });
        }

        let rollCallId = null;
        let otp = null;

        // Try to parse JSON format (New Dynamic System)
        try {
            const parsed = JSON.parse(token);
            // Strict check for format: { t: 'r', id, otp }
            if (parsed.t === 'r' && parsed.id && parsed.otp) {
                rollCallId = parsed.id;
                otp = parsed.otp;
            } else {
                throw new Error("Invalid format");
            }
        } catch (e) {
            // Reject any format that isn't valid JSON with correct structure
            return NextResponse.json({ error: "Geçersiz veya eski QR kod formatı. Lütfen yetkiliden QR kodunu yenilemesini isteyin." }, { status: 400 });
        }

        // 1. Fetch Roll Call
        const { data: rollCall, error: rcError } = await supabase
            .from("roll_calls")
            .select("id, committee_id, session_name, secret_key")
            .eq("id", rollCallId)
            .single();

        if (rcError || !rollCall) {
            return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 404 });
        }

        // 2. Strict OTP Verification
        if (!rollCall.secret_key) {
            // Should not happen for new rows, but block old rows just in case
            return NextResponse.json({ error: "Bu oturum güvenli doğrulamayı desteklemiyor. Lütfen yeni bir oturum oluşturun." }, { status: 400 });
        }

        const isValid = await verifyTOTP(otp, rollCall.secret_key);
        if (!isValid) {
            return NextResponse.json({ error: "QR kodun süresi dolmuş. Lütfen ekranı yenileyin ve tekrar okutun." }, { status: 400 });
        }

        // 3. Check User's Committee Membership
        const { data: membership } = await supabase
            .from("committee_members")
            .select("id")
            .eq("user_id", session.user.id)
            .eq("committee_id", rollCall.committee_id)
            .maybeSingle();

        const isAdmin = session.user.role === 'superadmin' || session.user.role === 'admin';

        if (!membership && !isAdmin) {
            return NextResponse.json({ error: "Bu yoklama sizin komitenize ait değil." }, { status: 403 });
        }

        // 4. Check if already scanned
        const { data: existingLog } = await supabase
            .from("roll_call_logs")
            .select("id")
            .eq("roll_call_id", rollCall.id)
            .eq("user_id", session.user.id)
            .maybeSingle();

        if (existingLog) {
            return NextResponse.json({ error: "Bu oturum için zaten yoklama verdiniz." }, { status: 409 });
        }

        // 5. Record Attendance
        const { error: insertError } = await supabase
            .from("roll_call_logs")
            .insert({
                roll_call_id: rollCall.id,
                user_id: session.user.id,
                scanned_at: new Date().toISOString()
            });

        if (insertError) throw insertError;

        await logAction(session.user.id, "scan_roll_call", { roll_call_id: rollCall.id, session: rollCall.session_name }, request);

        return NextResponse.json({ 
            success: true, 
            session_name: rollCall.session_name,
            message: "Yoklama başarıyla alındı."
        });

    } catch (error: any) {
        if (error.message === "Rate limit exceeded") {
            return NextResponse.json({ error: "Çok fazla deneme yaptınız. Lütfen bekleyin." }, { status: 429 });
        }
        console.error("Roll call scan error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// Change Log:
// - Completely removed fallback for legacy QR codes (raw UUID strings).
// - Strict enforcement of JSON structure `{t:'r', id, otp}`.
// - Strict enforcement of TOTP verification against `secret_key`.
// - Rejects requests if `secret_key` is missing or OTP is invalid.