import { NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { verifyEmailChallenge } from "@/lib/passwordless";
import { rateLimit } from "@/lib/rate-limit";
import { normalizeEmail } from "@/lib/crypto-utils";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });
const verifySchema = z.object({
  challengeId: z.string().uuid(),
  email: z.string().email().max(200),
  purpose: z.enum(["application", "login"]),
  code: z.string().regex(/^\d{6}$/),
  displayName: z.string().trim().max(100).optional(),
});

export const POST = apiHandler(async (request: Request) => {
  const body = verifySchema.parse(await request.json());
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  await limiter.check(10, `ip:${ip}`);
  await limiter.check(10, `email:${normalizeEmail(body.email)}`);

  const result = await verifyEmailChallenge(body);
  return NextResponse.json({ success: true, exchangeToken: result.exchangeToken });
});
