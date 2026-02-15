// app/api/auth/register/route.ts

import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { apiHandler } from "@/lib/api-handler";
import { rateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import { Logger } from "@/lib/logger";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { ROLES } from "@/lib/roles";

const registerLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 200 });

export const POST = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await registerLimiter.check(5, ip); // 5 attempts per minute per IP

  const { email, password, fullName, token } = await request.json();

  if (!email || !password || !fullName) {
    return NextResponse.json({ error: "E-posta, şifre ve ad soyad gereklidir." }, { status: 400 });
  }

  // 1. Verify Turnstile
  const isHuman = await verifyTurnstileToken(token);
  if (!isHuman) {
    return NextResponse.json({ error: "Doğrulama başarısız." }, { status: 403 });
  }

  // 2. Check if Email is Verified
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: verification } = await supabase
    .from("email_verifications")
    .select("id")
    .eq("email", email)
    .eq("verified", true)
    .gt("created_at", oneHourAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!verification) {
    return NextResponse.json(
      { error: "E-posta adresi doğrulanmamış veya doğrulama zaman aşımına uğramış." },
      { status: 400 }
    );
  }

  // 3. Check if User Already Exists
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (existingUser) {
    return NextResponse.json(
      { error: "Bu e-posta adresi ile zaten bir hesap mevcut." },
      { status: 409 }
    );
  }

  // 4. Hash Password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // 5. Create User
  const now = new Date().toISOString();
  const { data: newUser, error: createUserError } = await supabase
    .from("users")
    .insert({
      full_name: fullName,
      email: email,
      password_hash: passwordHash,
      role: ROLES.APPLICANT,
      created_at: now, // Explicit timestamp
      updated_at: now  // Explicit timestamp
    })
    .select("id, email, role")
    .single();

  if (createUserError) throw createUserError;

  // 6. Log Action
  await Logger.audit(
      { userId: newUser.id },
      { 
          action: "register", 
          category: "auth", 
          resourceType: "user",
          resourceId: newUser.id,
          metadata: { email: newUser.email } 
      }
  );

  return NextResponse.json({
    success: true,
    message: "Hesap başarıyla oluşturuldu.",
    user: newUser
  });
});