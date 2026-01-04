import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { apiHandler } from "@/lib/api-handler";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

// Separate limiters for Sending and Verifying to prevent different attack vectors
const sendLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 200 });
const verifyLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 200 });

// Send Verification Code
export const POST = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await sendLimiter.check(3, ip); // 3 sends per min

  const { email } = await request.json();
  if (!email) throw new Error("Email required");

  // Generate 6 digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 10).toISOString(); // 10 mins

  // Store
  const { error } = await supabase
    .from("email_verifications")
    .insert({ email, code, expires_at: expiresAt });

  if (error) throw error;

  // Send
  await sendEmail(
    email,
    "ATAGÇ - E-posta Doğrulama Kodu",
    `
      <h3>E-posta Doğrulama</h3>
      <p>Başvuru işleminize devam etmek için doğrulama kodunuz:</p>
      <h1 style="letter-spacing: 5px; background: #f0f0f0; padding: 10px; display: inline-block;">${code}</h1>
      <p><small>Bu kod 10 dakika geçerlidir.</small></p>
    `
  );

  return NextResponse.json({ success: true });
});

// Verify Code
export const PUT = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await verifyLimiter.check(10, ip); // 10 tries per min (allows for a few typos)

  const { email, code } = await request.json();

  const { data, error } = await supabase
    .from("email_verifications")
    .select("*")
    .eq("email", email)
    .eq("code", code)
    .eq("verified", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  // Mark as verified
  await supabase
    .from("email_verifications")
    .update({ verified: true })
    .eq("id", data.id);

  return NextResponse.json({ success: true });
});

// Change Log:
// - Added rate limiting to PUT (Verify) endpoint (10/min) to prevent code brute-forcing.
// - Kept POST (Send) endpoint rate limiting (3/min).