import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { logAction } from "@/lib/logger";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { getSignedUrls } from "@/lib/storage-utils";

const resourceSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  category: z.enum(["general", "guide", "rules", "award", "schedule"]),
  is_public: z.preprocess((val) => val === 'true', z.boolean()),
  committee_id: z.string().optional().nullable(),
});

const readLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });
const writeLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 100 });

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/jpeg',
  'image/png'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const GET = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await readLimiter.check(60, ip);

  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const session = auth.session;

  const { searchParams } = new URL(request.url);
  const userRole = session.user.role;

  let query = supabase
    .from("resources")
    .select("*, uploader:users(full_name), committee:committees(name)")
    .order("created_at", { ascending: false });

  if (["superadmin", "admin"].includes(userRole)) {
    const filterCommitteeId = searchParams.get("filterCommitteeId");
    if (filterCommitteeId && filterCommitteeId !== 'all') {
      if (filterCommitteeId === 'general') {
        query = query.is('committee_id', null);
      } else {
        query = query.eq('committee_id', filterCommitteeId);
      }
    }
  } else {
    // Participant Logic
    const { data: member } = await supabase.from("committee_members")
        .select('committee_id')
        .eq('user_id', session.user.id)
        .maybeSingle();
    const userCommitteeId = member?.committee_id;

    let orFilter = 'and(committee_id.is.null,is_public.eq.true)'; 
    if (userCommitteeId) {
      orFilter = `committee_id.eq.${userCommitteeId},${orFilter}`;
    }
    query = query.or(orFilter);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Generate Signed URLs
  const pathsToSign: string[] = [];
  data.forEach((r: any) => {
      // Prioritize storage_path if exists
      if (r.storage_path) pathsToSign.push(r.storage_path);
      // Fallback to legacy check if file_url looks like a path (not http)
      else if (r.file_url && !r.file_url.startsWith("http")) pathsToSign.push(r.file_url);
  });

  if (pathsToSign.length > 0) {
      const signedData = await getSignedUrls("resources", pathsToSign);
      signedData?.forEach(item => {
          data.forEach((r: any) => {
              if (r.storage_path === item.path || r.file_url === item.path) {
                  r.file_url = item.signedUrl; // Overwrite for frontend
              }
          });
      });
  }

  return NextResponse.json(data);
});

export const POST = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await writeLimiter.check(10, ip);

  const auth = await getAuthorization({ 
    requireAuth: true, 
    allowedRoles: ["superadmin", "admin", "committee_chairman"] 
  });
  
  if (!auth.ok || !auth.session) throw new Error("Forbidden");
  const session = auth.session;
  const userRole = session.user.role;

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const rawBody: any = {};
  formData.forEach((value, key) => {
    if (key !== 'file') rawBody[key] = value;
  });

  if (rawBody.committee_id === 'null' || rawBody.committee_id === '') {
    rawBody.committee_id = null;
  }
  
  const validData = resourceSchema.parse(rawBody);

  if (!file) throw new Error("Dosya yüklenmedi.");
  if (file.size > MAX_FILE_SIZE) throw new Error("Dosya boyutu çok büyük (Max 10MB).");
  if (!ALLOWED_MIME_TYPES.includes(file.type)) throw new Error("Geçersiz dosya formatı.");

  if (userRole === 'committee_chairman') {
    const { data: managedCommittee } = await supabase
      .from('committees')
      .select('id')
      .eq('admin_id', session.user.id)
      .single();

    if (!managedCommittee) throw new Error("Herhangi bir komiteyi yönetmiyorsunuz.");
    if (validData.committee_id !== managedCommittee.id) throw new Error("Sadece kendi komitenize dosya yükleyebilirsiniz.");
    validData.is_public = false;
  }

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

  // Save the internal path, not the public URL
  const { data, error } = await supabase
    .from("resources")
    .insert({
      ...validData,
      committee_id: validData.committee_id || null,
      file_url: filePath, // Storing path in file_url for compatibility, or add storage_path
      storage_path: filePath, // Explicitly storing path
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
// - POST: Saves `storage_path` to the database.
// - GET: Generates Signed URLs for resources based on `storage_path`.