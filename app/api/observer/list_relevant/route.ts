import { NextResponse } from "next/server";
import getAuthorization from "@/lib/getAuthorization";
import { supabase } from "@/lib/SERVER_supabase";
import { rateLimit } from "@/lib/rate-limit";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const GET = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(60, ip);

  const auth = await getAuthorization({
    requireAuth: true,
    allowedRoles: [ROLES.HEAD_OBSERVER, ROLES.SUPERADMIN, ROLES.ADMIN],
  });
  if (!auth.ok || !auth.session) throw new Error(auth.message || "Unauthorized");

  const { searchParams } = new URL(request.url);
  const committee = searchParams.get("committee");

  let query = supabase
    .from("observer_allocations")
    .select("id, allocated_field, allocated_committee, field_observer, users:id(id, full_name, email)");

  if (committee) {
    query = query.eq("allocated_committee", committee);
  } else {
    query = query.eq("field_observer", true);
  }

  const { data, error } = await query;

  if (error) throw error;

  return NextResponse.json(data);
});
