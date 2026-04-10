import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { apiHandler } from "@/lib/api-handler";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { generateEmailHtml } from "@/lib/email-templates";
import { isDisposableDomain } from "@/lib/disposableEmailDomains";

// Separate limiters for Sending and Verifying
const sendLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 200 });
const verifyLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 200 });

const BASE_URL = process.env.NEXTAUTH_URL || "https://panel.atagc.com.tr";

// Send Verification Code (Protected by Turnstile)
export const POST = apiHandler(async (request: Request) => {
  const { data: settings } = await supabase.from("system_settings").select("applications_open").single();
  if (settings && settings.applications_open === false) {
      return NextResponse.json({ error: "Başvurular şu anda kapalıdır." }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await sendLimiter.check(3, ip); // 3 sends per min limit still applies as fallback

  const { email, token } = await request.json();
  if (!email) throw new Error("Email required");

  // Verify Turnstile Token
  const isHuman = await verifyTurnstileToken(token);
  if (!isHuman) {
    return NextResponse.json({ error: "Doğrulama başarısız." }, { status: 403 });
  }

  // Block disposable email domains
  const emailDomain = email.split('@')[1]?.toLowerCase();
  if (!emailDomain || isDisposableDomain(emailDomain)) {
    return NextResponse.json(
      { error: "Geçici veya tek kullanımlık e-posta adresleri kabul edilmiyor. Lütfen başka bir e-posta adresi kullanın." },
      { status: 400 }
    );
  }

  // Generate 6 digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 10).toISOString(); // 10 mins

  // Store in DB
  const { error } = await supabase
    .from("email_verifications")
    .insert({
      email,
      code,
      expires_at: expiresAt,
      created_at: now.toISOString()
    });

  if (error) throw error;

  // Send Email with Template
  const emailHtml = generateEmailHtml(
    "email_verification",
    "Katılımcı Adayı",
    BASE_URL,
    { code }
  );

  await sendEmail(
    email,
    "ATAGÇ - E-posta Doğrulama Kodu",
    emailHtml
  );

  return NextResponse.json({ success: true });
});

// Verify Code (Checking the digits entered by user)
export const PUT = apiHandler(async (request: Request) => {
  const { data: settings } = await supabase.from("system_settings").select("applications_open").single();
  if (settings && settings.applications_open === false) {
      return NextResponse.json({ error: "Başvurular şu anda kapalıdır." }, { status: 403 });
  }

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