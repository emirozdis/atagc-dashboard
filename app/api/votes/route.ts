import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { rateLimit } from "@/lib/rate-limit";

// Read: 60/min, Write: 10/min
const readLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });
const writeLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 200 });

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  try {
    await writeLimiter.check(10, ip);
  } catch {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["committee_chairman", "superadmin"] });
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: 401 });

  try {
    const { committeeId, title, options } = await request.json();

    // 1. Create Vote
    const { data: vote, error: voteError } = await supabase
      .from("votes")
      .insert({ committee_id: committeeId, title, status: 'open' })
      .select("id")
      .single();

    if (voteError) throw voteError;

    // 2. Create Options
    const optionsData = options.map((label: string) => ({
      vote_id: vote.id,
      label
    }));

    const { error: optionsError } = await supabase
      .from("vote_options")
      .insert(optionsData);

    if (optionsError) throw optionsError;

    return NextResponse.json({ success: true, voteId: vote.id });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create vote" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  try {
    await readLimiter.check(60, ip);
  } catch {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const committeeId = searchParams.get("committeeId");

  if (!committeeId) return NextResponse.json({ error: "Missing committee ID" }, { status: 400 });

  // Update: fetching user_id in responses to check "Has Voted" status on frontend
  const { data, error } = await supabase
    .from("votes")
    .select(`
      id, title, status, created_at,
      options:vote_options(id, label),
      responses:vote_responses(option_id, user_id)
    `)
    .eq("committee_id", committeeId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// Change Log:
// - Added rate limiting: GET (60/min), POST (10/min).