import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  try {
    await limiter.check(60, ip);
  } catch {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  const { data, error } = await supabase
    .from("application_forms")
    .select("id, slug, title, description, fee, steps")
    .eq("is_active", true)
    .order("fee", { ascending: false }); // Just an arbitrary sort order

  if (error) {
    console.error("Fetch forms error:", error);
    return NextResponse.json({ error: "Failed to fetch forms" }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Change Log:
// - New API endpoint to fetch active application form templates.