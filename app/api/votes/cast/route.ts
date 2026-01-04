import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { rateLimit } from "@/lib/rate-limit";

// Rate limit: 10 votes per minute per IP (generous but prevents rapid script spam)
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export async function POST(request: Request) {
  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    await limiter.check(10, ip);

    const { voteId, optionId } = await request.json();
    const userId = auth.session.user.id;

    // Check if user already voted
    const { data: existing } = await supabase
      .from("vote_responses")
      .select("id")
      .eq("vote_id", voteId)
      .eq("user_id", userId)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Already voted" }, { status: 409 });
    }

    const { error } = await supabase
      .from("vote_responses")
      .insert({ vote_id: voteId, option_id: optionId, user_id: userId });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "Rate limit exceeded") {
      return NextResponse.json({ error: "Too many requests. Please wait." }, { status: 429 });
    }
    return NextResponse.json({ error: "Failed to cast vote" }, { status: 500 });
  }
}

// Change Log:
// - Added rate limiting (10 requests/min).