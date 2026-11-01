import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { apiHandler } from "@/lib/api-handler";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({ namespace: "api/high-schools:limiter", interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const GET = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(100, ip);

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  if (!search || search.length < 3) {
    return NextResponse.json([]);
  }

  // Search directly; the legacy RPC is not present in every environment.
  const { data, error } = await supabase
    .from("high_schools")
    .select("id, school_name, city, district")
    .ilike("school_name", `%${search}%`)
    .limit(20);

  if (error) {
    console.error("High school search error:", error);
    throw error;
  }

  return NextResponse.json(data || []);
});