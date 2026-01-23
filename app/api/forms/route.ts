import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { rateLimit } from "@/lib/rate-limit";
import { apiHandler } from "@/lib/api-handler";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const GET = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(60, ip);

  const { data, error } = await supabase
    .from("application_forms")
    .select("id, slug, title, description, fee, steps")
    .eq("is_active", true)
    .order("fee", { ascending: false }); 

  if (error) throw error;

  return NextResponse.json(data);
});
