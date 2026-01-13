import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { apiHandler } from "@/lib/api-handler";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";

// Separate limiters for Sending and Verifying
const sendLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 200 });
const verifyLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 200 });

// Send Verification Code (Protected by Turnstile)
export const POST = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await sendLimiter.check(3, ip); // 3 sends per min limit still applies as fallback

  const { email, token } = await request.json();
  if (!email) throw new Error("Email required");

  // Verify Turnstile Token
  const isHuman = await verifyTurnstileToken(token);
  if (!isHuman) {
    return NextResponse.json({ error: "Doğrulama başarısız." }, { status: 403 });
  }

  // Generate 6 digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 10).toISOString(); // 10 mins

  // Store in DB
  const { error } = await supabase
    .from("email_verifications")
    .insert({ email, code, expires_at: expiresAt });

  if (error) throw error;

  // Send Email
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

// Verify Code (Checking the digits entered by user)
export const PUT = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await verifyLimiter.check(10, ip); // 10 tries per min

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

  // Test Bypass (Optional - remove in production or use env var)
  if (code === "000000" && email.includes("test")) {
    return NextResponse.json({ success: true });
  }

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
// - Updated POST handler to extract and verify `token` (Cloudflare Turnstile).
// - Returns 403 if Turnstile verification fails.