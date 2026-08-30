import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { Logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { getSignedUrls } from "@/lib/storage-utils";
import { resourceUploadSchema } from "@/lib/schemas";
import { ROLES, MANAGEMENT_ROLES } from "@/lib/roles";
import { canAccessCommittee } from "@/lib/committee-access";
import { assertFileSignature } from "@/lib/upload-validation";
import crypto from "node:crypto";

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
  const resourceRows = (data || []) as unknown as Array<Record<string, unknown>>;
  resourceRows.forEach((r) => {
      const storagePath = typeof r.storage_path === "string" ? r.storage_path : null;
      const fileUrl = typeof r.file_url === "string" ? r.file_url : null;
      const path = storagePath || (fileUrl && !fileUrl.startsWith("http") ? fileUrl : null);
      if (path) pathsToSign.push(path);
  });

  if (pathsToSign.length > 0) {
      const signedData = await getSignedUrls("resources", pathsToSign);
      const urlMap = new Map(signedData?.map(s => [s.path, s.signedUrl]));
      
      resourceRows.forEach((r) => {
          const key = typeof r.storage_path === "string" ? r.storage_path : typeof r.file_url === "string" ? r.file_url : null;
          if (key && urlMap.has(key)) r.file_url = urlMap.get(key);
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
  
  const rawBody: Record<string, string | null> = {};
  formData.forEach((value, key) => {
    if (key !== 'file' && typeof value === "string") rawBody[key] = value;
  });

  if (rawBody.committee_id === 'null' || rawBody.committee_id === '') {
    rawBody.committee_id = null;
  }
  
  const validData = resourceUploadSchema.parse(rawBody);

  if (!file) throw new Error("No file was uploaded.");
  if (file.size > MAX_FILE_SIZE) throw new Error("The file is too large (max 10 MB).");
  if (!ALLOWED_MIME_TYPES.includes(file.type)) throw new Error("Unsupported file type.");
  await assertFileSignature(file);

  if (session.user.role === ROLES.CHAIRMAN) {
    const { data: managed } = await supabase
      .from('committees')
      .select('id')
      .eq('admin_id', session.user.id)
      .single();

    if (!managed) throw new Error("You do not manage a committee.");
    if (validData.committee_id !== managed.id) throw new Error("You can upload files only to your own committee.");
    
    validData.is_public = false; 
  }

  // Upload
  const fileExt = file.type === "application/pdf" ? "pdf" : file.type === "application/msword" ? "doc" : file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ? "docx" : file.type === "image/png" ? "png" : "jpg";
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `uploads/${fileName}`;
  
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('resources')
    .upload(filePath, Buffer.from(arrayBuffer), { contentType: file.type });

  if (uploadError) throw new Error("The file could not be saved on the server.");

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

  if (error) {
    await supabase.storage.from("resources").remove([filePath]);
    throw error;
  }

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

export const DELETE = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.CHAIRMAN] });
  if (!auth.ok || !auth.session) throw new Error("Forbidden");
  const id = new URL(request.url).searchParams.get("id");
  if (!id) throw new Error("Resource ID is required.");

  const { data: resource } = await supabase.from("resources").select("id, committee_id, storage_path, file_url").eq("id", id).maybeSingle();
  if (!resource) return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  if (resource.committee_id && !(await canAccessCommittee(auth.session.user.id, auth.session.user.role, resource.committee_id, true))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const path = resource.storage_path || (resource.file_url?.startsWith("http") ? null : resource.file_url);
  if (path) await supabase.storage.from("resources").remove([path]);
  const { error } = await supabase.from("resources").delete().eq("id", id);
  if (error) throw error;
  await supabase.from("audit_logs").insert({ user_id: auth.session.user.id, action: "delete_resource", resource_type: "resource", resource_id: id });
  return NextResponse.json({ success: true });
});
