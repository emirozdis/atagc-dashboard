import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";
import { applicationFieldSchema, applicationQuestionsSchema } from "@/lib/application-form-schema";

const feeSchema = z.union([z.number(), z.string().trim().min(1)])
  .transform((value) => typeof value === "number" ? value : Number(value))
  .refine((value) => Number.isFinite(value) && value >= 0, "Fee must be a non-negative number.");

const formUpdateSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000),
  fee: feeSchema,
  steps: z.array(z.object({ fields: z.array(applicationFieldSchema).optional() }).passthrough()).optional(),
  questions: applicationQuestionsSchema.optional(),
  is_active: z.boolean().optional(),
});

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

  const { id, title, description, fee, steps, questions, is_active } = formUpdateSchema.parse(await request.json());

  const { data: current, error: currentError } = await supabase.from("application_forms").select("version, application_type, is_active, questions").eq("id", id).maybeSingle();
  if (currentError || !current) throw new Error("Form not found.");

  const currentQuestions = applicationQuestionsSchema.safeParse(current.questions);
  if (!currentQuestions.success && questions === undefined && steps === undefined) {
    throw new Error("The stored form questions are invalid. Edit the questions before saving.");
  }

  const normalizedQuestions = Array.isArray(questions)
    ? questions
    : Array.isArray(steps)
      ? steps.flatMap((step: { fields?: unknown[] }) => Array.isArray(step.fields) ? step.fields : [])
      : currentQuestions.success ? currentQuestions.data : [];

  const { error } = await supabase
    .from("application_forms")
    .update({
      title,
      description,
      fee,
      // Keep the legacy JSON column compatible while exposing one flat form
      // to both the public application and the admin editor.
      steps: [{ id: "application", title: "Application questions", fields: normalizedQuestions }],
      is_active: is_active ?? Boolean(current.is_active),
      version: Number(current.version || 1) + 1,
      questions: normalizedQuestions,
    })
    .eq("id", id);

  if (error) throw error;

  // The public application pages are statically rendered with ISR. Invalidate
  // the saved form's page so the next visitor receives the updated questions.
  revalidatePath(`/apply/${current.application_type}`);
  revalidatePath("/apply");

  return NextResponse.json({ success: true });
});
