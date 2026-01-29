import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { Logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { getSignedUrls } from "@/lib/storage-utils";
import { resourceUploadSchema } from "@/lib/schemas";
import { ROLES, MANAGEMENT_ROLES } from "@/lib/roles";

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

  const auth = await getAuthorization({ requireAuth: true, requireApproved: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const session = auth.session;

  const { searchParams } = new URL(request.url);
  const userRole = session.user.role;

  let query = supabase
    .from("resources")
    .select("*, uploader:users(full_name), committee:committees(name)")
    .order("created_at", { ascending: false });

  if (MANAGEMENT_ROLES.includes(userRole)) {
    const filterCommitteeId = searchParams.get("filterCommitteeId");
    if (filterCommitteeId && filterCommitteeId !== 'all') {
      if (filterCommitteeId === 'general') {
        query = query.is('committee_id', null);
      } else {
        query = query.eq('committee_id', filterCommitteeId);
      }
    }
  } else {
    const { data: member } = await supabase.from("committee_members")
        .select('committee_id')
        .eq('user_id', session.user.id)
        .maybeSingle();
    
    let orFilter = 'is_public.eq.true'; 
    if (member?.committee_id) {
      orFilter += `,committee_id.eq.${member.committee_id}`;
    }
    query = query.or(orFilter);
  }

  const { data, error } = await query;
  if (error) throw error;

  const pathsToSign: string[] = [];
  data.forEach((r: any) => {
      const path = r.storage_path || (r.file_url && !r.file_url.startsWith("http") ? r.file_url : null);
      if (path) pathsToSign.push(path);
  });

  if (pathsToSign.length > 0) {
      const signedData = await getSignedUrls("resources", pathsToSign);
      const urlMap = new Map(signedData?.map(s => [s.path, s.signedUrl]));
      
      data.forEach((r: any) => {
          const key = r.storage_path || r.file_url;
          if (urlMap.has(key)) r.file_url = urlMap.get(key);
      });
  }

  return NextResponse.json(data);
});

export const POST = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await writeLimiter.check(10, ip);

  const auth = await getAuthorization({ 
    requireAuth: true, 
    allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.CHAIRMAN] 
  });
  if (!auth.ok || !auth.session) throw new Error("Forbidden");
  const session = auth.session;

  const formData = await request.formData();
  const file = formData.get("file") as File;
  
  const rawBody: any = {};
  formData.forEach((value, key) => {
    if (key !== 'file') rawBody[key] = value;
  });

  if (rawBody.committee_id === 'null' || rawBody.committee_id === '') {
    rawBody.committee_id = null;
  }
  
  const validData = resourceUploadSchema.parse(rawBody);

  if (!file) throw new Error("Dosya yüklenmedi.");
  if (file.size > MAX_FILE_SIZE) throw new Error("Dosya boyutu çok büyük (Max 10MB).");
  if (!ALLOWED_MIME_TYPES.includes(file.type)) throw new Error("Geçersiz dosya formatı.");

  if (session.user.role === ROLES.CHAIRMAN) {
    const { data: managed } = await supabase
      .from('committees')
      .select('id')
      .eq('admin_id', session.user.id)
      .single();

    if (!managed) throw new Error("Yönettiğiniz bir komite bulunamadı.");
    if (validData.committee_id !== managed.id) throw new Error("Sadece kendi komitenize dosya yükleyebilirsiniz.");
    
    validData.is_public = false; 
  }

  // Upload
  const fileExt = file.name.split('.').pop();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${Date.now()}-${sanitizedName}`;
  const filePath = `uploads/${fileName}`;
  
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('resources')
    .upload(filePath, Buffer.from(arrayBuffer), { contentType: file.type });

  if (uploadError) throw new Error("Dosya sunucuya kaydedilemedi.");

  // Insert DB
  const { data, error } = await supabase
    .from("resources")
    .insert({
      title: validData.title,
      description: validData.description,
      category: validData.category,
      is_public: validData.is_public,
      committee_id: validData.committee_id,
      file_url: filePath,
      storage_path: filePath,
      file_type: fileExt,
      uploaded_by: session.user.id,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  await Logger.audit(
      { userId: session.user.id, req: request },
      { 
          action: "upload_resource", 
          category: "system",
          resourceType: "resource",
          resourceId: data.id,
          metadata: { title: validData.title }
      }
  );

  return NextResponse.json({ success: true, data });
});