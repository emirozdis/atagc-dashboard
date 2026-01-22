import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { generateTOTP } from "@/lib/otp";

// Force dynamic to allow streaming
export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // 1. Auth Check
    const auth = await getAuthorization({ 
        requireAuth: true, 
        allowedRoles: ["superadmin", "admin", "committee_chairman", "deputy_chair"] 
    });
    
    if (!auth.ok || !auth.session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const session = auth.session;

    // 2. Fetch Roll Call Secret
    const { data: rollCall, error } = await supabase
        .from("roll_calls")
        .select("id, committee_id, secret_key")
        .eq("id", id)
        .single();

    if (error || !rollCall || !rollCall.secret_key) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // 3. Authorization Check
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

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
        async start(controller) {
            const sendToken = async () => {
                try {
                    // Generate securely on server
                    const otp = await generateTOTP(rollCall.secret_key!);
                    
                    const payload = JSON.stringify({
                        t: 'r',
                        id: rollCall.id,
                        otp: otp
                    });
                    
                    // Send as a pure data event
                    const data = `data: ${payload}\n\n`;
                    controller.enqueue(encoder.encode(data));
                } catch (err) {
                    console.error("Token gen error:", err);
                    controller.close();
                }
            };

            // Initial Send
            await sendToken();

            // Loop every 5 seconds
            const interval = setInterval(sendToken, 5000);

            // Keep-alive heartbeat (every 15s) to prevent timeouts
            const keepAlive = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(`: keep-alive\n\n`));
                } catch (e) {
                    clearInterval(keepAlive);
                }
            }, 15000);

            request.signal.addEventListener("abort", () => {
                clearInterval(interval);
                clearInterval(keepAlive);
                controller.close();
            });
        }
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        },
    });
}

// Change Log:
// - Removed server-side Supabase Realtime logic (unreliable in serverless SSE).
// - Focuses purely on streaming the secure QR Token.s