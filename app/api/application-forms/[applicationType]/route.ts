import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { supabase } from "@/lib/SERVER_supabase";
import { ApplicationType, PUBLIC_APPLICATION_TYPES } from "@/lib/roles";

export const GET = apiHandler(async (_request: Request, { params }: { params: Promise<{ applicationType: string }> }) => {
  const { applicationType } = await params;
  if (!PUBLIC_APPLICATION_TYPES.includes(applicationType as ApplicationType)) {
    return NextResponse.json({ error: "Application type not found" }, { status: 404 });
  }
  const { data, error } = await supabase
    .from("application_forms")
    .select("id, application_type, title, description, fee, questions, version")
    .eq("application_type", applicationType)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Application type not found" }, { status: 404 });
  return NextResponse.json(data);
});
