import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { supabase } from "@/lib/SERVER_supabase";

export const GET = apiHandler(async () => {
  const { data, error } = await supabase.from("conference_team_members").select("id, full_name, role, bio, image_url").eq("is_published", true).order("sort_order").order("full_name");
  if (error) throw new Error("Unable to load the conference team.");
  return NextResponse.json({ members: data || [] });
});
