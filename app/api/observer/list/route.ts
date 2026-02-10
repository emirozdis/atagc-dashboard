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

  // Get all users with observer role
  const { data: observers, error: observerError } = await supabase
    .from("users")
    .select("id, full_name, email")
    .eq("role", ROLES.OBSERVER)
    .order("full_name");

  if (observerError) throw observerError;

  if (!observers || observers.length === 0) {
    return NextResponse.json([]);
  }

  // Get allocations for these observers
  const observerIds = observers.map((o) => o.id);
  const { data: allocations, error: allocError } = await supabase
    .from("observer_allocations")
    .select("id, allocated_committee, allocated_field, field_observer")
    .in("id", observerIds);

  if (allocError) throw allocError;

  // Build allocation map
  const allocationMap = new Map(
    (allocations || []).map((a) => [a.id, a])
  );

  // Merge
  const result = observers.map((o) => {
    const alloc = allocationMap.get(o.id);
    return {
      id: o.id,
      full_name: o.full_name,
      email: o.email,
      allocation: alloc
        ? {
            allocated_committee: alloc.allocated_committee,
            allocated_field: alloc.allocated_field,
            field_observer: alloc.field_observer,
          }
        : null,
    };
  });

  return NextResponse.json(result);
});
