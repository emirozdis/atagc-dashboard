import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

export const GET = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ 
    requireAuth: true, 
    allowedRoles: [ROLES.SUPERADMIN] 
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
    allowedRoles: [ROLES.SUPERADMIN] 
  });
  if (!auth.ok) throw new Error("Unauthorized");

  const body = await request.json();
  const { id, title, description, fee, steps, is_active } = body;

  const { error } = await supabase
    .from("application_forms")
    .update({
      title,
      description,
      fee,
      steps,
      is_active,
    })
    .eq("id", id);

  if (error) throw error;

  return NextResponse.json({ success: true });
});
