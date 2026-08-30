import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { randomUUID } from "node:crypto";

type ApiHandlerFunction<TContext = unknown> = (
  req: Request,
  context: TContext
) => Promise<NextResponse | Response>;

export function apiHandler<TContext>(handler: ApiHandlerFunction<TContext>): ApiHandlerFunction<TContext> {
  return async (req: Request, context: TContext) => {
    try {
      return await handler(req, context);
    } catch (err: unknown) {
      // Get session for logging if available
      const session = await getServerSession(authOptions);
      const userId = session?.user?.id;
      const errorMessage = err instanceof Error ? err.message : "Unknown API error";
      const errorCode = typeof err === "object" && err !== null && "code" in err ? String(err.code) : "";

      // New Logger system
      const requestId = randomUUID();
      await Logger.error(
        { userId, req },
        `API Error: ${req.method} ${new URL(req.url).pathname} [${requestId}]`,
        err instanceof Error ? err : new Error(errorMessage)
      );

      // Zod Validation Errors
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: "Validation Error", details: err.format() },
          { status: 400 }
        );
      }

      // Known Errors
      if (errorMessage === "Unauthorized" || errorMessage.includes("Unauthorized")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (errorMessage === "Forbidden" || errorMessage.includes("Forbidden")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (errorMessage === "Account suspended") {
        return NextResponse.json({ error: "Account unavailable" }, { status: 403 });
      }

      if (errorMessage.includes("Rate limit")) {
        return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
      }

      if (errorMessage.includes("security verification")) {
        return NextResponse.json({ error: "Security verification failed", message: errorMessage }, { status: 400 });
      }

      // Database Duplicate Key Errors (Postgres)
      if (errorCode === "23505") {
        return NextResponse.json(
          { error: "Conflict", message: "This record already exists." },
          { status: 409 }
        );
      }

      // Default Generic Error
      return NextResponse.json(
        { error: "Internal Server Error", requestId },
        { status: 500 }
      );
    }
  };
}
