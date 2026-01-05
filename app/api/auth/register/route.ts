import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { apiHandler } from "@/lib/api-handler";
import { rateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import { logAction } from "@/lib/logger";

const registerLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 200 });

export const POST = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await registerLimiter.check(5, ip); // 5 attempts per minute per IP

  const { email, password, fullName } = await request.json();

  if (!email || !password || !fullName) {
    return NextResponse.json({ error: "E-posta, şifre ve ad soyad gereklidir." }, { status: 400 });
  }

  // 1. Check if Email is Verified
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

  // 2. Check if User Already Exists
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

  // 3. Hash Password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // 4. Create User
  const { data: newUser, error: createUserError } = await supabase
    .from("users")
    .insert({
      full_name: fullName,
      email: email,
      password_hash: passwordHash,
      role: 'applicant',
    })
    .select("id, email, role")
    .single();

  if (createUserError) throw createUserError;

  // 5. Log Action
  await logAction(newUser.id, "register", { email: newUser.email });

  return NextResponse.json({
    success: true,
    message: "Hesap başarıyla oluşturuldu.",
    user: newUser
  });
});
