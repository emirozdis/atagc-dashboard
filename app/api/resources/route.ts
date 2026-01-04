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
  committee_id: z.string().uuid().optional().nullable(),
});

// Read: 60/min, Write: 10/min
const readLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });
const writeLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 100 });

export const GET = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await readLimiter.check(60, ip);

  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const session = auth.session;

  const { searchParams } = new URL(request.url);
  const userRole = session.user.role;

  // ADMIN path: Can see everything, with optional filters
  if (["superadmin", "admin"].includes(userRole)) {
    let query = supabase
      .from("resources")
      .select("*, uploader:users(full_name), committee:committees(name)")
      .order("created_at", { ascending: false });

    const filterCommitteeId = searchParams.get("filterCommitteeId");
    if (filterCommitteeId && filterCommitteeId !== 'all') {
      if (filterCommitteeId === 'general') {
        query = query.is('committee_id', null);
      } else {
        query = query.eq('committee_id', filterCommitteeId);
      }
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  }

  // PARTICIPANT path: Gets committee-specific + public general resources automatically
  
  // 1. Find user's committee
  const { data: member } = await supabase.from("committee_members")
      .select('committee_id')
      .eq('user_id', session.user.id)
      .maybeSingle();
  const userCommitteeId = member?.committee_id;

  // 2. Build filter
  // Base case: All users can see public, general (no committee) resources.
  let orFilter = 'and(committee_id.is.null,is_public.eq.true)'; 
  if (userCommitteeId) {
    // If user is in a committee, they can also see resources for their committee.
    orFilter = `committee_id.eq.${userCommitteeId},${orFilter}`;
  }

  // 3. Fetch resources based on the constructed filter
  const { data, error } = await supabase
    .from("resources")
    .select("*, uploader:users(full_name)")
    .or(orFilter)
    .order("created_at", { ascending: false });

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
  const session = auth.session;
  const userRole = session.user.role;

  const body = await request.json();
  const validData = resourceSchema.parse(body);

  // Security check for chairmen
  if (userRole === 'committee_chairman') {
    // 1. Find the committee this chairman manages
    const { data: managedCommittee } = await supabase
      .from('committees')
      .select('id')
      .eq('admin_id', session.user.id)
      .single();

    if (!managedCommittee) {
      throw new Error("Forbidden: You do not manage any committee.");
    }
    
    // 2. Check if the upload is for their own committee
    if (validData.committee_id !== managedCommittee.id) {
      throw new Error("Forbidden: You can only upload resources to your own committee.");
    }

    // 3. Enforce privacy for chairman uploads
    validData.is_public = false;
  }

  const { data, error } = await supabase
    .from("resources")
    .insert({
      ...validData,
      committee_id: validData.committee_id || null,
      uploaded_by: auth.session.user.id
    })
    .select()
    .single();

  if (error) throw error;

  await logAction(auth.session.user.id, "upload_resource", { 
    resource_id: data.id, 
    title: validData.title,
    committee_id: validData.committee_id
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
// - Added security check in POST endpoint to ensure chairmen can only upload to their own committee.
// - Enforced `is_public: false` for all uploads made by chairmen.
// - Existing GET logic was already correct and did not require changes.