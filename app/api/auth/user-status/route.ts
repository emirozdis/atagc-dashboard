import { NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });
const schema = z.object({ email: z.string().email().max(200) });

// This endpoint is retained for legacy clients. It deliberately returns one
// indistinguishable state so it cannot enumerate registered accounts.
export const POST = apiHandler(async (request: Request) => {
  await limiter.check(10, request.headers.get("x-forwarded-for") || "127.0.0.1");
  schema.parse(await request.json());
  return NextResponse.json({ status: "verification_required" });
});
