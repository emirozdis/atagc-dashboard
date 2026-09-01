import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import getAuthorization from "@/lib/getAuthorization";
import { createCollaborationToken, COLLABORATION_TOKEN_LIFETIME_SECONDS } from "@/lib/collaboration-token";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 });

export const GET = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session?.user.sessionId) throw new Error(auth.message || "Unauthorized");
  await limiter.check(30, auth.session.user.id || request.headers.get("x-forwarded-for") || "unknown");

  return NextResponse.json({
    token: createCollaborationToken(auth.session.user.id, auth.session.user.sessionId),
    expiresInSeconds: COLLABORATION_TOKEN_LIFETIME_SECONDS,
  });
});
