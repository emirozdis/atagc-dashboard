// app/api/auth/check/route.ts

import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { rateLimit } from "@/lib/rate-limit";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const GET = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(100, ip);

  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");

  const userId = auth.session.user.id;

  const { data: user, error } = await supabase
    .from("users")
    .select(`
        role,
        application:applications(status)
    `)
    .eq("id", userId)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const app = Array.isArray(user.application) ? user.application[0] : user.application;

  const isStaff = [
    ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.DEPUTY_CHAIR,
    ROLES.DELEGATE, ROLES.PRESS, ROLES.OBSERVER
  ].includes(user.role);

  const status = app?.status || (isStaff ? 'approved' : undefined);

  return NextResponse.json({
    role: user.role,
    applicationStatus: status
  });
});