import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { supabase } from "@/lib/SERVER_supabase";

export const GET = apiHandler(async () => {
  const { data, error } = await supabase.from("committees").select("id, name, slug, description, image_url, is_published").eq("is_published", true).order("name");
  if (error) throw new Error("Unable to load committees.");
  return NextResponse.json({ committees: data || [] });
});
