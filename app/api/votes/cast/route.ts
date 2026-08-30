import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { rateLimit } from "@/lib/rate-limit";
import { apiHandler } from "@/lib/api-handler";
import { canAccessCommittee } from "@/lib/committee-access";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const POST = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");

  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(10, ip);

  const { voteId, optionId } = await request.json();
  if (typeof voteId !== "string" || typeof optionId !== "string") throw new Error("Invalid vote input");
  const userId = auth.session.user.id;

  const { data: vote } = await supabase.from("votes").select("id, committee_id, status").eq("id", voteId).maybeSingle();
  if (!vote) return NextResponse.json({ error: "Vote not found" }, { status: 404 });
  if (vote.status !== "open") return NextResponse.json({ error: "Vote is closed" }, { status: 409 });
  if (!(await canAccessCommittee(userId, auth.session.user.role, vote.committee_id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: option } = await supabase.from("vote_options").select("id").eq("id", optionId).eq("vote_id", voteId).maybeSingle();
  if (!option) return NextResponse.json({ error: "Option does not belong to this vote" }, { status: 400 });

  const { data: existing } = await supabase
    .from("vote_responses")
    .select("id")
    .eq("vote_id", voteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Already voted" }, { status: 409 });
  }

  const { error } = await supabase
    .from("vote_responses")
    .insert({ vote_id: voteId, option_id: optionId, user_id: userId });

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Already voted" }, { status: 409 });
    throw error;
  }

  return NextResponse.json({ success: true });
});
