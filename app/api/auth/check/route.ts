import { NextResponse } from "next/server";
import getAuthorization from "@/lib/getAuthorization";
import { rateLimit } from "@/lib/rate-limit";
import { apiHandler } from "@/lib/api-handler";
import { supabase } from "@/lib/SERVER_supabase";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const GET = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(100, ip);

  // 1. Authorization Check (now verifies DB session existence via getAuthorization changes)
  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) {
    // Explicitly return 401 so RoleSyncer can catch it
    return NextResponse.json({ error: "Session invalid" }, { status: 401 });
  }

  const sessionId = auth.session.user.sessionId;

  // 2. Update Last Active
  // We do this here to keep the session alive in the DB as long as the user is polling
  if (sessionId) {
    await supabase
        .from("active_sessions")
        .update({ last_active: new Date().toISOString() })
        .eq("id", sessionId);
  }

  return NextResponse.json({
    role: auth.session.user.role,
    applicationStatus: auth.session.user.applicationStatus,
  });
});
