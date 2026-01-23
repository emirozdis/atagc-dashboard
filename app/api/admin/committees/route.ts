import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { logAction } from "@/lib/logger";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";
import { committeeSchema } from "@/lib/schemas";

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
  const validated = committeeSchema.parse(body);

  const { data: committee, error: commError } = await supabase
    .from("committees")
    .insert({ name: validated.name, description: validated.description })
    .select("id")
    .single();

  if (commError) throw commError;

  if (validated.topicTitle) {
    const { error: topicError } = await supabase
      .from("topics")
      .insert({
        committee_id: committee.id,
        title: validated.topicTitle,
        description: validated.topicDescription
      });
    
    if (topicError) console.error("Topic creation failed:", topicError);
  }

  await logAction(session?.user?.id, "create_committee", { 
      name: validated.name, 
      committee_id: committee.id
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
  const validated = committeeSchema.parse(body);
  if (!validated.id) throw new Error("ID required for update");

  const { data: previousState } = await supabase
      .from("committees")
      .select("*, topic:topics(title, description)")
      .eq("id", validated.id)
      .single();

  const { error: commError } = await supabase
    .from("committees")
    .update({ name: validated.name, description: validated.description })
    .eq("id", validated.id);

  if (commError) throw commError;

  if (validated.topicTitle) {
    const { data: existingTopic } = await supabase.from("topics").select("id").eq("committee_id", validated.id).maybeSingle();
    
    if (existingTopic) {
        await supabase.from("topics").update({ 
            title: validated.topicTitle, 
            description: validated.topicDescription 
        }).eq("id", existingTopic.id);
    } else {
        await supabase.from("topics").insert({
            committee_id: validated.id,
            title: validated.topicTitle,
            description: validated.topicDescription
        });
    }
  }

  await logAction(session?.user?.id, "update_committee", { 
      committee_id: validated.id, 
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