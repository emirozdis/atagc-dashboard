import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { rateLimit } from "@/lib/rate-limit";
import { Logger } from "@/lib/logger";
import { ROLES } from "@/lib/roles";

const writeLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 100 });

export const POST = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await writeLimiter.check(5, ip);

  // Only superadmin and admin can populate the database
  const auth = await getAuthorization({
    requireAuth: true,
    allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN]
  });
  if (!auth.ok || !auth.session) throw new Error(auth.message);

  // Get all approved users from applications table
  const { data: approvedApplications, error: fetchError } = await supabase
    .from("applications")
    .select("user_id")
    .eq("status", "approved");

  if (fetchError) throw fetchError;

  if (!approvedApplications || approvedApplications.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No approved applications found",
      inserted: 0,
      skipped: 0
    });
  }

  const userIds = approvedApplications.map(app => app.user_id);

  // Get existing entries in catering_database
  const { data: existingEntries, error: existingError } = await supabase
    .from("catering_database")
    .select("user_id")
    .in("user_id", userIds);

  if (existingError) throw existingError;

  const existingUserIds = new Set(existingEntries?.map(e => e.user_id) || []);

  // Filter out users that already have entries
  const newUserIds = userIds.filter(id => !existingUserIds.has(id));

  let insertedCount = 0;

  if (newUserIds.length > 0) {
    // Insert new entries with all days set to false by default
    const newEntries = newUserIds.map(userId => ({
      user_id: userId,
      day1: false,
      day2: false,
      day3: false
    }));

    const { error: insertError } = await supabase
      .from("catering_database")
      .insert(newEntries);

    if (insertError) throw insertError;

    insertedCount = newUserIds.length;
  }

  // Log the action
  await Logger.audit(
    { userId: auth.session.user.id, req: request },
    {
      action: "populate_catering_database",
      category: "business",
      resourceType: "catering",
      metadata: {
        total_approved: userIds.length,
        inserted: insertedCount,
        skipped: existingUserIds.size
      }
    }
  );

  return NextResponse.json({
    success: true,
    message: `Populated catering database successfully`,
    inserted: insertedCount,
    skipped: existingUserIds.size,
    total_approved: userIds.length
  });
});