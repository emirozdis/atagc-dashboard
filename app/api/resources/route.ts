import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { logAction } from "@/lib/logger";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

// Schema for Metadata Validation
const resourceSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  category: z.enum(["general", "guide", "rules", "award", "schedule"]),
  is_public: z.preprocess((val) => val === 'true', z.boolean()),
  committee_id: z.string().optional().nullable(),
});

// Read: 60/min, Write: 10/min
const readLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });
const writeLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 100 });

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/msword', // doc
  'image/jpeg',
  'image/png'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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

  // 1. Parse FormData
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const rawBody: any = {};
  formData.forEach((value, key) => {
    if (key !== 'file') rawBody[key] = value;
  });

  // 2. Validate Metadata using Zod
  if (rawBody.committee_id === 'null' || rawBody.committee_id === '') {
    rawBody.committee_id = null;
  }
  
  try {
    resourceSchema.parse(rawBody);
  } catch (zodError: any) {
    return NextResponse.json({ error: "Eksik veya hatalı bilgi girildi." }, { status: 400 });
  }
  
  const validData = resourceSchema.parse(rawBody);

  // 3. Server-Side File Validation (Returns 400 instead of throwing Error)
  if (!file) {
    return NextResponse.json({ error: "Dosya yüklenmedi." }, { status: 400 });
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Dosya boyutu çok büyük (Max 10MB)." }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Geçersiz dosya formatı. (PDF, DOCX, JPG, PNG kabul edilir)." }, { status: 400 });
  }

  // 4. Role-Based Security Checks
  if (userRole === 'committee_chairman') {
    // Check managed committee
    const { data: managedCommittee } = await supabase
      .from('committees')
      .select('id')
      .eq('admin_id', session.user.id)
      .single();

    if (!managedCommittee) {
      return NextResponse.json({ error: "Herhangi bir komiteyi yönetmiyorsunuz." }, { status: 403 });
    }
    
    if (validData.committee_id !== managedCommittee.id) {
      return NextResponse.json({ error: "Sadece kendi komitenize dosya yükleyebilirsiniz." }, { status: 403 });
    }

    // Force private for chairmen
    validData.is_public = false;
  }

  // 5. Upload to Supabase Storage (Server-Side)
  const fileExt = file.name.split('.').pop();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${Date.now()}-${sanitizedName}`;
  const filePath = `uploads/${fileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from('resources')
    .upload(filePath, fileBuffer, {
      contentType: file.type,
      upsert: false
    });

  if (uploadError) {
    console.error("Storage upload failed:", uploadError);
    return NextResponse.json({ error: "Dosya sunucuya kaydedilemedi." }, { status: 500 });
  }

  // 6. Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from('resources')
    .getPublicUrl(filePath);

  // 7. Insert DB Record
  const { data, error } = await supabase
    .from("resources")
    .insert({
      ...validData,
      committee_id: validData.committee_id || null,
      file_url: publicUrl,
      file_type: fileExt,
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

// Change Log:
// - Replaced `throw new Error(...)` with `return NextResponse.json({ error: "..." }, { status: 400 })` for user-facing validation errors (Validation, Size, Type).
// - This ensures the frontend receives a clean error message instead of a generic 500 error.