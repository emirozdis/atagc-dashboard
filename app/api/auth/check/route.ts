import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { rateLimit } from "@/lib/rate-limit";

// Higher limit for this specific lightweight endpoint to allow frequent polling if needed
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  
  // Allow up to 100 requests per minute per IP for this specific check
  try {
    await limiter.check(100, ip);
  } catch {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = auth.session.user.id;

  // Single, extremely fast query. No joins, no storage calls.
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

  // Normalize application status
  const app = Array.isArray(user.application) ? user.application[0] : user.application;
  
  // Staff roles are implicitly approved
  const isStaff = ['superadmin', 'admin', 'committee_chairman', 'deputy_chair', 'delegate', 'press', 'observer'].includes(user.role);
  const status = app?.status || (isStaff ? 'approved' : 'pending');

  return NextResponse.json({
    role: user.role,
    applicationStatus: status
  });
}

// Change Log:
// - New lightweight endpoint created specifically for RoleSyncer.
// - Performs 1 simple DB query instead of the 6+ complex queries in `/me`.