import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { rateLimit } from "@/lib/rate-limit";

const readLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const GET = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await readLimiter.check(60, ip);

  // Check auth - all roles allowed
  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error(auth.message);

  const userId = auth.session.user.id;

  // Query the catering_database table for this user
  const { data, error } = await supabase
    .from("catering_database")
    .select("day1, day2, day3")
    .eq("user_id", userId)
    .single();

  if (error) {
    // If no record exists, return default false values
    if (error.code === "PGRST116") {
      return NextResponse.json([false, false, false]);
    }
    throw error;
  }

  // Return array of day statuses
  return NextResponse.json([
    data.day1 ?? false,
    data.day2 ?? false,
    data.day3 ?? false
  ]);
});