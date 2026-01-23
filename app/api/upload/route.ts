import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { rateLimit } from "@/lib/rate-limit";
import { deleteFile } from "@/lib/storage-utils";
import { apiHandler } from "@/lib/api-handler";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

export const POST = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(10, ip);

  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) {
    throw new Error("Unauthorized");
  }
  const userId = auth.session.user.id;

  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Sadece resim dosyaları (JPG, PNG, WEBP) yüklenebilir." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Dosya boyutu 5MB'dan küçük olmalıdır." }, { status: 400 });
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from("profile-pictures")
    .upload(filePath, fileBuffer, {
      contentType: file.type,
      upsert: true
    });

  if (uploadError) throw uploadError;

  const { data: currentDetails } = await supabase
    .from("user_details")
    .select("profile_picture_url")
    .eq("user_id", userId)
    .maybeSingle();

  if (currentDetails?.profile_picture_url) {
    await deleteFile("profile-pictures", currentDetails.profile_picture_url);
  }

  return NextResponse.json({
    url: filePath,
    isPath: true 
  });
});