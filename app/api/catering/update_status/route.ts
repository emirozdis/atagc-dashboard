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
  await writeLimiter.check(10, ip);

  // Check auth with specific roles (to be specified later)
  // For now, allowing SUPERADMIN and ADMIN only
  const auth = await getAuthorization({
    requireAuth: true,
    allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN]
  });
  if (!auth.ok || !auth.session) throw new Error(auth.message);

  const body = await request.json();
  const { userid, day } = body;

  // Validate inputs
  if (!userid) {
    throw new Error("Missing userid parameter");
  }

  if (typeof day !== "number" || day < 1 || day > 3) {
    throw new Error("Invalid day parameter. Must be integer 1-3");
  }

  // Determine which column to update
  const dayColumn = `day${day}` as "day1" | "day2" | "day3";

  // Check if record exists
  const { data: existing, error: fetchError } = await supabase
    .from("catering_database")
    .select("*")
    .eq("user_id", userid)
    .maybeSingle();

  if (fetchError) throw fetchError;

  let updateData: any = {};
  updateData[dayColumn] = true;

  if (existing) {
    // Update existing record
    const { error: updateError } = await supabase
      .from("catering_database")
      .update(updateData)
      .eq("user_id", userid);

    if (updateError) throw updateError;
  } else {
    // Insert new record with the specific day set to true
    const insertData = {
      userid,
      day1: day === 1,
      day2: day === 2,
      day3: day === 3
    };

    const { error: insertError } = await supabase
      .from("catering_database")
      .insert(insertData);

    if (insertError) throw insertError;
  }

  // Log the action
  await Logger.audit(
    { userId: auth.session.user.id, req: request },
    {
      action: "update_catering_status",
      category: "business",
      resourceType: "catering",
      resourceId: userid,
      metadata: { day, affected_user: userid }
    }
  );

  return NextResponse.json({ success: true });
});