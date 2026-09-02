import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

export const GET = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({
    requireAuth: true,
    allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN]
  });
  if (!auth.ok) throw new Error("Unauthorized");

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const { data, error } = await supabase
      .from("application_forms")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from("application_forms")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return NextResponse.json(data);
});

export const PUT = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({
    requireAuth: true,
    allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN]
  });
  if (!auth.ok) throw new Error("Unauthorized");

  const body = await request.json();
  const { id, title, description, fee, steps, questions, is_active } = body;

  const { data: current, error: currentError } = await supabase.from("application_forms").select("version").eq("id", id).maybeSingle();
  if (currentError || !current) throw new Error("Form not found.");

  const normalizedQuestions = Array.isArray(questions)
    ? questions
    : Array.isArray(steps)
      ? steps.flatMap((step: { fields?: unknown[] }) => Array.isArray(step.fields) ? step.fields : [])
      : [];

  const { error } = await supabase
    .from("application_forms")
    .update({
      title,
      description,
      fee: Number.isFinite(Number(fee)) && Number(fee) >= 0 ? Number(fee) : 0,
      // Keep the legacy JSON column compatible while exposing one flat form
      // to both the public application and the admin editor.
      steps: [{ id: "application", title: "Application questions", fields: normalizedQuestions }],
      is_active,
      version: Number(current.version || 1) + 1,
      questions: normalizedQuestions,
    })
    .eq("id", id);

  if (error) throw error;

  return NextResponse.json({ success: true });
});
