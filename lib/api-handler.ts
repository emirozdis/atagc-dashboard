import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

type ApiHandlerFunction = (
  req: Request,
  context?: any
) => Promise<NextResponse | Response>;

export function apiHandler(handler: ApiHandlerFunction): ApiHandlerFunction {
  return async (req: Request, context?: any) => {
    try {
      return await handler(req, context);
    } catch (err: any) {
      // Get session for logging if available
      const session = await getServerSession(authOptions as any) as any;
      const userId = session?.user?.id;

      // New Logger system
      await Logger.error(
        { userId, req },
        `API Error: ${req.method} ${new URL(req.url).pathname}`,
        err
      );

      // Zod Validation Errors
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: "Validation Error", details: err.format() },
          { status: 400 }
        );
      }

      // Known Errors
      if (err.message === "Unauthorized" || err.message.includes("Unauthorized")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (err.message === "Forbidden" || err.message.includes("Forbidden")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (err.message.includes("Rate limit")) {
        return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
      }

      // Database Duplicate Key Errors (Postgres)
      if (err.code === "23505") {
        return NextResponse.json(
          { error: "Conflict", message: "Bu kayıt zaten mevcut." },
          { status: 409 }
        );
      }

      // Default Generic Error
      const message = err instanceof Error ? err.message : "Internal Server Error";
      return NextResponse.json(
        { error: "Internal Server Error", message },
        { status: 500 }
      );
    }
  };
}