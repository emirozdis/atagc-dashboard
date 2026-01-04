import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { apiHandler } from "@/lib/api-handler";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 100 });

export const POST = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(3, ip); // Limit: 3 requests per min per IP

  const { email } = await request.json();
  if (!email) throw new Error("Email is required");

  // 1. Check if user exists
  const { data: user } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("email", email)
    .single();

  if (!user) {
    // Return success even if user not found to prevent enumeration attacks
    return NextResponse.json({ success: true, message: "If account exists, email sent." });
  }

  // 2. Generate Token
  const token = uuidv4();
  // Hash token before storage for security
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString(); // 30 mins

  // 3. Store in DB
  const { error } = await supabase
    .from("password_resets")
    .insert({
      email,
      token_hash: tokenHash,
      expires_at: expiresAt,
      used: false
    });

  if (error) throw error;

  // 4. Send Email
  const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
  
  await sendEmail(
    email,
    "ATAGÇ - Şifre Sıfırlama Talebi",
    `
      <h3>Merhaba ${user.full_name},</h3>
      <p>Şifrenizi sıfırlamak için bir talep aldık. Eğer bu işlemi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
      <p>Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
      <a href="${resetLink}" style="background:#000; color:#fff; padding:10px 20px; text-decoration:none; border-radius:5px;">Şifremi Sıfırla</a>
      <p><small>Bu link 30 dakika süreyle geçerlidir.</small></p>
    `
  );

  return NextResponse.json({ success: true, message: "Reset email sent." });
});