import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";

export const GET = apiHandler(async () => {
  const auth = await getAuthorization({ requireAuth: true, requireApproved: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("photo_areas")
    .select("*")
    .order("name");

  if (error) throw error;
  return NextResponse.json(data);
});
