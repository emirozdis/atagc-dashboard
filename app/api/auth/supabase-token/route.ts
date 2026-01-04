import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateSupabaseToken } from "@/lib/supabase-token";
import { rateLimit } from "@/lib/rate-limit";

// Moderate limit: 30 requests per minute (Token refresh/init logic)
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  try {
    await limiter.check(30, ip);
  } catch {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = generateSupabaseToken(session.user.id, session.user.email || undefined);
    return NextResponse.json({ token });
  } catch (error) {
    console.error("Token generation failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Change Log:
// - Added rate limiting (30 requests/min).