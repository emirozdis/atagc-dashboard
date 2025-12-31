import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { logAction } from "@/lib/logger";

export async function GET() {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
  if (!auth.ok) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
  const session = auth.session;

  const { data, error } = await supabase
    .from("committees")
    .select("*, topic:topics(id, title, description)");
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
  if (!auth.ok) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
  const session = auth.session;

  try {
    const body = await request.json();
    const { name, description, topicTitle, topicDescription } = body;

    // 1. Create Committee
    const { data: committee, error: commError } = await supabase
      .from("committees")
      .insert({ name, description })
      .select("id")
      .single();

    if (commError) throw commError;

    // 2. Create Topic if provided
    if (topicTitle) {
      const { error: topicError } = await supabase
        .from("topics")
        .insert({
          committee_id: committee.id,
          title: topicTitle,
          description: topicDescription
        });
      
      if (topicError) console.error("Topic creation failed:", topicError);
    }

    await logAction(session?.user?.id, "create_committee", { 
        name, 
        description, 
        committee_id: committee.id,
        previous_state: null
    }, request);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Create committee error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
  if (!auth.ok) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
  const session = auth.session;

  try {
    const body = await request.json();
    const { id, name, description, topicTitle, topicDescription } = body;

    // Fetch previous state
    const { data: previousState } = await supabase
        .from("committees")
        .select("*, topic:topics(title, description)")
        .eq("id", id)
        .single();

    // 1. Update Committee
    const { error: commError } = await supabase
      .from("committees")
      .update({ name, description })
      .eq("id", id);

    if (commError) throw commError;

    // 2. Upsert Topic
    if (topicTitle) {
      // Check existing topic
      const { data: existingTopic } = await supabase
        .from("topics")
        .select("id")
        .eq("committee_id", id)
        .single();

      if (existingTopic) {
        await supabase
          .from("topics")
          .update({ title: topicTitle, description: topicDescription })
          .eq("id", existingTopic.id);
      } else {
        await supabase
          .from("topics")
          .insert({
            committee_id: id,
            title: topicTitle,
            description: topicDescription
          });
      }
    }

    await logAction(session?.user?.id, "update_committee", { 
        committee_id: id, 
        name, 
        description,
        previous_state: previousState 
    }, request);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update committee error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
  if (!auth.ok) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
  const session = auth.session;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  // Fetch previous state
  const { data: previousState } = await supabase
      .from("committees")
      .select("*")
      .eq("id", id)
      .single();

  const { error } = await supabase.from("committees").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAction(session?.user?.id, "delete_committee", { 
      committee_id: id,
      previous_state: previousState
  }, request);

  return NextResponse.json({ success: true });
}
// Change Log:
// - Updated PUT and DELETE to fetch and log `previous_state` before modification.