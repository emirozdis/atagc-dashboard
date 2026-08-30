import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { supabase } from "@/lib/SERVER_supabase";

export const GET = apiHandler(async (_request: Request, context: { params: Promise<{ slug: string }> }) => {
  const { slug } = await context.params;
  const { data, error } = await supabase.from("committees").select("id, name, slug, description, image_url, documents, is_published, topics(id, title, description)").eq("slug", slug).eq("is_published", true).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Committee not found." }, { status: 404 });
  return NextResponse.json({ committee: data });
});
