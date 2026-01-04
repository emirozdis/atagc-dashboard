import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { logAction } from "@/lib/logger";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const resourceSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  file_url: z.string().url(),
  file_type: z.string(),
  category: z.enum(["general", "guide", "rules", "award", "schedule"]),
  is_public: z.boolean().default(false),
});

// Read: 60/min, Write: 10/min
const readLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });
const writeLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 100 });

export const GET = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await readLimiter.check(60, ip);

  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const isPublic = searchParams.get("is_public");

  let query = supabase
    .from("resources")
    .select("*, uploader:users(full_name)")
    .order("created_at", { ascending: false });

  // Filter Logic
  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  // Permission Logic
  const role = auth.session.user.role;
  const canSeePrivate = ["superadmin", "admin", "staff", "staffleader", "committee_chairman"].includes(role);

  if (!canSeePrivate) {
    query = query.eq("is_public", true);
  } else if (isPublic === "true") {
    query = query.eq("is_public", true);
  } else if (isPublic === "false") {
    query = query.eq("is_public", false);
  }

  const { data, error } = await query;
  if (error) throw error;

  return NextResponse.json(data);
});

export const POST = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await writeLimiter.check(10, ip);

  const auth = await getAuthorization({ 
    requireAuth: true, 
    allowedRoles: ["superadmin", "admin", "staff", "staffleader", "committee_chairman"] 
  });
  
  if (!auth.ok || !auth.session) throw new Error("Forbidden");

  const body = await request.json();
  const validData = resourceSchema.parse(body);

  const { data, error } = await supabase
    .from("resources")
    .insert({
      ...validData,
      uploaded_by: auth.session.user.id
    })
    .select()
    .single();

  if (error) throw error;

  await logAction(auth.session.user.id, "upload_resource", { 
    resource_id: data.id, 
    title: validData.title 
  }, request);

  return NextResponse.json({ success: true, data });
});

export const DELETE = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await writeLimiter.check(10, ip);

  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
  if (!auth.ok || !auth.session) throw new Error("Forbidden");

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) throw new Error("Missing ID");

  // Fetch info for logging
  const { data: resource } = await supabase.from("resources").select("title").eq("id", id).single();

  const { error } = await supabase.from("resources").delete().eq("id", id);
  if (error) throw error;

  await logAction(auth.session.user.id, "delete_resource", { 
    resource_id: id, 
    title: resource?.title 
  }, request);

  return NextResponse.json({ success: true });
});

// Change Log:
// - Added rate limiting: GET (60/min), POST/DELETE (10/min).