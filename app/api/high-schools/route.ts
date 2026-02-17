import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { apiHandler } from "@/lib/api-handler";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const GET = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(100, ip);

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  if (!search || search.length < 3) {
    return NextResponse.json([]);
  }

  // Calls the RPC function 'search_high_schools'
  const { data, error } = await supabase.rpc('search_high_schools', { 
    search_text: search 
  });

  if (error) {
    console.error("High school search error:", error);
    // Fallback if RPC not yet created
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("high_schools")
      .select("id, school_name, city, district") // Added district
      .ilike("school_name", `%${search}%`)
      .limit(20);
      
    if (fallbackError) throw fallbackError;
    return NextResponse.json(fallbackData);
  }

  return NextResponse.json(data);
});