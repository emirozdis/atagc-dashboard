import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { logAction } from "@/lib/logger";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

export const GET = apiHandler(async () => {
  const auth = await getAuthorization({ 
    requireAuth: true, 
    allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] 
  });
  if (!auth.ok) throw new Error(auth.message);

  const { data, error } = await supabase
    .from("committees")
    .select("*, topic:topics(id, title, description)");
  
  if (error) throw error;
  return NextResponse.json(data);
});

export const POST = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ 
    requireAuth: true, 
    allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] 
  });
  if (!auth.ok) throw new Error(auth.message);
  const session = auth.session;

  const body = await request.json();
  const { name, description, topicTitle, topicDescription } = body;

  const { data: committee, error: commError } = await supabase
    .from("committees")
    .insert({ name, description })
    .select("id")
    .single();

  if (commError) throw commError;

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
});

export const PUT = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ 
    requireAuth: true, 
    allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] 
  });
  if (!auth.ok) throw new Error(auth.message);
  const session = auth.session;

  const body = await request.json();
  const { id, name, description, topicTitle, topicDescription } = body;

  const { data: previousState } = await supabase
      .from("committees")
      .select("*, topic:topics(title, description)")
      .eq("id", id)
      .single();

  const { error: commError } = await supabase
    .from("committees")
    .update({ name, description })
    .eq("id", id);

  if (commError) throw commError;

  if (topicTitle) {
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
});

export const DELETE = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ 
    requireAuth: true, 
    allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] 
  });
  if (!auth.ok) throw new Error(auth.message);
  const session = auth.session;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) throw new Error("Missing ID");

  const { data: previousState } = await supabase
      .from("committees")
      .select("*")
      .eq("id", id)
      .single();

  const { error } = await supabase.from("committees").delete().eq("id", id);

  if (error) throw error;

  await logAction(session?.user?.id, "delete_committee", { 
      committee_id: id,
      previous_state: previousState
  }, request);

  return NextResponse.json({ success: true });
});
