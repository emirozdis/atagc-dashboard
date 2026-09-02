import { NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { createEmailChallenge } from "@/lib/passwordless";
import { rateLimit } from "@/lib/rate-limit";
import { normalizeEmail } from "@/lib/crypto-utils";
import { verifyTurnstileToken } from "@/lib/turnstile";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });
const requestSchema = z.object({
  email: z.string().email().max(200),
  purpose: z.enum(["application", "login"]),
  displayName: z.string().trim().max(100).optional(),
  turnstileToken: z.string().min(1).max(4096),
});

export const POST = apiHandler(async (request: Request) => {
  const body = requestSchema.parse(await request.json());
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  await limiter.check(5, `ip:${ip}`);
  await limiter.check(5, `email:${normalizeEmail(body.email)}`);
  if (!(await verifyTurnstileToken(body.turnstileToken, request))) {
    throw new Error("Please complete the security verification and try again.");
  }

  const result = await createEmailChallenge(body);
  return NextResponse.json({
    success: true,
    challengeId: result.challengeId,
  });
});
