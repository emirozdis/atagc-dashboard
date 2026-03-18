import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";

export const GET = apiHandler(async () => {
  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok) throw new Error("Unauthorized");

  const { data } = await supabase
    .from("system_settings")
    .select("gallery_enabled")
    .limit(1)
    .single();

  return NextResponse.json({ enabled: data?.gallery_enabled ?? false });
});
