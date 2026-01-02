import jwt from "jsonwebtoken";

export function generateSupabaseToken(userId: string, email?: string) {
  const secret = process.env.SUPABASE_JWT_SECRET;
  
  if (!secret) {
    throw new Error("SUPABASE_JWT_SECRET is missing");
  }

  const payload = {
    aud: "authenticated", // Required: Audience
    role: "authenticated", // Required: Postgres Role
    sub: userId,           // Required: User ID (matches auth.uid() in RLS)
    email: email,          // Optional: Available in auth.jwt()
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hour expiration
  };

  return jwt.sign(payload, secret);
}