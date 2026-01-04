import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { apiHandler } from "@/lib/api-handler";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { logAction } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

// Limit: 3 attempts per minute per IP (Strict security)
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 100 });

export const POST = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(3, ip);

  const { token, email, newPassword } = await request.json();

  if (!token || !email || !newPassword) throw new Error("Missing fields");
  if (newPassword.length < 6) throw new Error("Password too short");

  // 1. Verify Token
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const { data: record, error } = await supabase
    .from("password_resets")
    .select("*")
    .eq("email", email)
    .eq("token_hash", tokenHash)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !record) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  // 2. Hash New Password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  // 3. Update User
  const { error: updateError } = await supabase
    .from("users")
    .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
    .eq("email", email);

  if (updateError) throw updateError;

  // 4. Mark Token Used
  await supabase
    .from("password_resets")
    .update({ used: true })
    .eq("id", record.id);

  // 5. Get User ID for logging
  const { data: user } = await supabase.from("users").select("id").eq("email", email).single();
  if (user) {
    await logAction(user.id, "reset_password", { method: "email_recovery" }, request);
  }

  return NextResponse.json({ success: true, message: "Password updated." });
});

// Change Log:
// - Added strict rate limiting (3 requests/min) to prevent brute-force attacks on the reset endpoint.