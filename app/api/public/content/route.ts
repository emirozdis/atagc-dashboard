import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { supabase } from "@/lib/SERVER_supabase";

export const GET = apiHandler(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  let query = supabase.from("conference_pages").select("id, slug, title, excerpt, body, updated_at").eq("is_published", true);
  if (slug) query = query.eq("slug", slug);
  const { data, error } = await query.order("title");
  if (error) throw new Error("Unable to load conference content.");
  return NextResponse.json({ pages: data || [] });
});
