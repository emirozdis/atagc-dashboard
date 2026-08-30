import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { rateLimit } from "@/lib/rate-limit";
import { getSignedUrls } from "@/lib/storage-utils";
import { deleteFile } from "@/lib/storage-utils";
import { MANAGEMENT_ROLES, PRESS_TEAM } from "@/lib/roles";
import { Logger } from "@/lib/logger";

const readLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const GET = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await readLimiter.check(60, ip);

  const auth = await getAuthorization({ requireAuth: true, requireApproved: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");

  // Check gallery_enabled
  const { data: settings } = await supabase
    .from("system_settings")
    .select("gallery_enabled")
    .limit(1)
    .single();

  if (!settings?.gallery_enabled) {
    return NextResponse.json({ error: "The gallery is currently closed." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const areaId = searchParams.get("area_id");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "24"), 50);
  const offset = (page - 1) * limit;

  let query = supabase
    .from("press_photos")
    .select("*, area:photo_areas(*), uploader:users(id, full_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (areaId) {
    query = query.eq("area_id", areaId);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const photos = data || [];

  // Batch sign URLs
  const pathsToSign: string[] = [];
  photos.forEach((p: Record<string, unknown>) => {
    if (p.storage_path) pathsToSign.push(p.storage_path as string);
  });

  if (pathsToSign.length > 0) {
    const signedData = await getSignedUrls("press-photos", pathsToSign);
    const urlMap = new Map(signedData?.map(s => [s.path, s.signedUrl]));

    photos.forEach((p: Record<string, unknown>) => {
      if (urlMap.has(p.storage_path as string)) {
        p.signed_url = urlMap.get(p.storage_path as string);
      }
    });
  }

  return NextResponse.json({
    photos,
    total: count || 0,
    page,
    limit,
  });
});

export const DELETE = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({
    requireAuth: true,
    allowedRoles: [...MANAGEMENT_ROLES, ...PRESS_TEAM],
  });
  if (!auth.ok || !auth.session) throw new Error("Forbidden");
  const session = auth.session;

  const { searchParams } = new URL(request.url);
  const photoId = searchParams.get("id");
  if (!photoId) return NextResponse.json({ error: "Photo ID is required." }, { status: 400 });

  // Fetch photo
  const { data: photo, error: fetchError } = await supabase
    .from("press_photos")
    .select("*")
    .eq("id", photoId)
    .single();

  if (fetchError || !photo) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  // Only admin or the uploader can delete
  const isAdmin = MANAGEMENT_ROLES.includes(session.user.role);
  if (!isAdmin && photo.uploaded_by !== session.user.id) {
    return NextResponse.json({ error: "You do not have permission to delete this photo." }, { status: 403 });
  }

  // Delete from storage
  await deleteFile("press-photos", photo.storage_path);

  // Delete from DB
  const { error: deleteError } = await supabase
    .from("press_photos")
    .delete()
    .eq("id", photoId);

  if (deleteError) throw deleteError;

  await Logger.audit(
    { userId: session.user.id, req: request },
    {
      action: "delete_press_photo",
      category: "system",
      resourceType: "press_photo",
      resourceId: photoId,
    }
  );

  return NextResponse.json({ success: true });
});
