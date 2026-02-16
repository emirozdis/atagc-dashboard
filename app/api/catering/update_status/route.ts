import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { rateLimit } from "@/lib/rate-limit";
import { Logger } from "@/lib/logger";
import { ROLES } from "@/lib/roles";

const writeLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 100 });

// Placeholder: specific user IDs allowed to log catering beyond superadmin/admin
const ALLOWED_USER_IDS: string[] = [
  // "uuid-of-allowed-user-1",
  // "uuid-of-allowed-user-2",
];

export const POST = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await writeLimiter.check(10, ip);

  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error(auth.message);

  const callerRole = auth.session.user?.role;
  const callerId = auth.session.user.id;

  // Only superadmin, admin, or specifically allowed users can call this
  const isRoleAllowed = callerRole === ROLES.SUPERADMIN || callerRole === ROLES.ADMIN;
  const isUserAllowed = ALLOWED_USER_IDS.includes(callerId);

  if (!isRoleAllowed && !isUserAllowed) {
    Logger.info("User role", { role: callerRole });
    throw new Error("Unauthorized: You do not have permission to log catering status.");
  }

  const body = await request.json();
  const { short_id } = body;

  if (!short_id || typeof short_id !== "string") {

    throw new Error("Missing short_id parameter");
  }

  // Resolve short_id to full user_id
  // ShortId algorithm (from DigitalIdCard): user.id.split('-')[0].toUpperCase()
  // UUID first segment is 8 hex chars, so we filter by id prefix
  const prefix = short_id.toLowerCase();

  // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  // Construct range bounds using the prefix as the first 8 chars
  const lowerBound = `${prefix}-0000-0000-0000-000000000000`;
  const upperBound = `${prefix}-ffff-ffff-ffff-ffffffffffff`;

  const { data: matchedUser, error: lookupError } = await supabase
    .from("users")
    .select("id, full_name")
    .gte("id", lowerBound)
    .lte("id", upperBound)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (!matchedUser) {
    throw new Error("Bu kimlik numarasına ait kullanıcı bulunamadı.");
  }

  const userId = matchedUser.id;

  // Check if the user has already been logged today (same calendar day)
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const { data: existingLog, error: checkError } = await supabase
    .from("catering_database")
    .select("id")
    .eq("user_id", userId)
    .gte("datetime", startOfDay)
    .lt("datetime", endOfDay)
    .maybeSingle();

  if (checkError) throw checkError;

  if (existingLog) {
    return NextResponse.json(
      { success: false, message: "Bu kullanıcı bugün zaten kaydedilmiş." },
      { status: 409 }
    );
  }

  // Insert a new catering log row
  const { error: insertError } = await supabase
    .from("catering_database")
    .insert({
      user_id: userId,
      datetime: new Date().toISOString(),
      created_by: callerId,
    });

  if (insertError) throw insertError;

  await Logger.audit(
    { userId: callerId, req: request },
    {
      action: "log_catering",
      category: "business",
      resourceType: "catering",
      resourceId: userId,
      metadata: { affected_user: userId, short_id }
    }
  );

  return NextResponse.json({ success: true, user_name: matchedUser.full_name });
});