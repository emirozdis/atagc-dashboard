import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { Logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { PRESS_TEAM } from "@/lib/roles";
import { assertFileSignature } from "@/lib/upload-validation";
import crypto from "node:crypto";

const uploadLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 100 });

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const POST = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await uploadLimiter.check(10, ip);

  const auth = await getAuthorization({
    requireAuth: true,
    allowedRoles: PRESS_TEAM,
  });
  if (!auth.ok || !auth.session) throw new Error("Forbidden");
  const session = auth.session;

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const areaId = formData.get("area_id") as string;
  if (!file) throw new Error("No file was uploaded.");
  if (!areaId) throw new Error("Select an area.");
  if (file.size > MAX_FILE_SIZE) throw new Error("The file is too large (max 10 MB).");
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error("Only image files (JPG, PNG, WEBP) can be uploaded.");
  }
  await assertFileSignature(file);

  // Validate area exists
  const { data: area, error: areaError } = await supabase
    .from("photo_areas")
    .select("id")
    .eq("id", areaId)
    .single();

  if (areaError || !area) throw new Error("Invalid area selection.");

  // Upload to storage
  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `photos/${areaId}/${fileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("press-photos")
    .upload(filePath, Buffer.from(arrayBuffer), {
      contentType: file.type,
    });

  if (uploadError) throw new Error("The file could not be saved on the server.");

  // Insert into DB
  const { data, error } = await supabase
    .from("press_photos")
    .insert({
      area_id: areaId,
      storage_path: filePath,
      file_type: ext,
      uploaded_by: session.user.id,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    await supabase.storage.from("press-photos").remove([filePath]);
    throw error;
  }

  await Logger.audit(
    { userId: session.user.id, req: request },
    {
      action: "upload_press_photo",
      category: "system",
      resourceType: "press_photo",
      resourceId: data.id,
      metadata: { area_id: areaId },
    }
  );

  return NextResponse.json({ success: true, data });
});
