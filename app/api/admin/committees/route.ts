import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "superadmin" && session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("committees")
    .select("*, topic:topics(id, title, description)");
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "superadmin" && session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Create committee error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "superadmin" && session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, description, topicTitle, topicDescription } = body;

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update committee error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "superadmin" && session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  // Note: Cascading deletes usually handled by DB, but here we might need manual cleanup 
  // if Foreign Keys aren't set to CASCADE. Assuming DB schema handles basic integrity or we catch error.
  const { error } = await supabase.from("committees").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}