import { NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { consumeDevicePairingCode } from "@/lib/passwordless";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ code: z.string().min(8).max(32) });
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const POST = apiHandler(async (request: Request) => {
  const { code } = schema.parse(await request.json());
  await limiter.check(20, request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1");
  const exchangeToken = await consumeDevicePairingCode({
    code,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: request.headers.get("user-agent") || undefined,
  });
  return NextResponse.json({ success: true, exchangeToken });
});
