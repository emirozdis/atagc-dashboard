import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";

export async function POST(request: Request) {
  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
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
  } catch (error) {
    return NextResponse.json({ error: "Failed to cast vote" }, { status: 500 });
  }
}