import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { rateLimit } from "@/lib/rate-limit";
import { deleteFile } from "@/lib/storage-utils";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  try {
    await limiter.check(10, ip);
  } catch {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = auth.session.user.id;

  try {
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

    // Upload to 'profile-pictures' bucket
    const { error: uploadError } = await supabase.storage
      .from("profile-pictures")
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Resim yüklenirken hata oluştu." }, { status: 500 });
    }

    // --- NEW: Delete Old Profile Picture ---
    // 1. Get current picture path from DB
    const { data: currentDetails } = await supabase
      .from("user_details")
      .select("profile_picture_url")
      .eq("user_id", userId)
      .maybeSingle();

    // 2. Delete it from storage if it exists
    if (currentDetails?.profile_picture_url) {
      await deleteFile("profile-pictures", currentDetails.profile_picture_url);
    }
    // ----------------------------------------

    // Instead of public URL, return the storage path
    return NextResponse.json({
      url: filePath,
      isPath: true // Hint to frontend that this is a path, not a displayable URL immediately
    });

  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Change Log:
// - Modified to return `filePath` instead of `publicUrl`.
// - This ensures the path is stored in the DB, allowing us to generate Signed URLs later.
// - Added logic to delete the old profile picture from storage before returning the new path.