import { supabase } from "@/lib/SERVER_supabase";

/**
 * Extracts the file path from a Supabase public URL if it points to the given bucket.
 */
function getPathFromPublicUrl(bucket: string, url: string) {
  // Look for the bucket name preceded and followed by a slash
  const searchStr = `/${bucket}/`;
  const index = url.indexOf(searchStr);
  if (index !== -1) {
    const path = url.substring(index + searchStr.length);
    return path;
  }
  return url;
}

/**
 * Generates a signed URL for a file in Supabase Storage.
 * @param bucket The storage bucket name
 * @param path The file path inside the bucket (or a public URL to be converted)
 * @param expiresIn Seconds until expiration (default 1 hour)
 */
export async function getSignedUrl(bucket: string, path: string | null | undefined, expiresIn = 3600) {
  if (!path) return null;

  // If it's a public URL for this bucket, extract the path
  let cleanPath = getPathFromPublicUrl(bucket, path);

  // Ensure no leading slash for Supabase Storage paths
  if (cleanPath.startsWith("/")) {
    cleanPath = cleanPath.substring(1);
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(cleanPath, expiresIn);

  if (error) {
    console.error(`Error signing URL for ${bucket}/${cleanPath}:`, error);
    // If it was already a public URL and signing failed, return as is as fallback
    if (path.startsWith("http")) return path;
    return null;
  }

  return data.signedUrl;
}

/**
 * Generates multiple signed URLs in batch.
 */
export async function getSignedUrls(bucket: string, paths: string[], expiresIn = 3600) {
  if (!paths || paths.length === 0) return [];

  // Prepare paths by stripping public URL prefixes if present
  const storagePaths = paths.map(p => getPathFromPublicUrl(bucket, p));

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(storagePaths, expiresIn);

  if (error) {
    console.error(`Error batch signing URLs for ${bucket}:`, error);
    // Private files must never be exposed as raw storage paths when signing fails.
    return paths.map(p => ({ path: p, signedUrl: null }));
  }

  return data;
}

/**
 * Deletes a file from Supabase Storage.
 */
export async function deleteFile(bucket: string, path: string | null | undefined) {
  if (!path) return;

  // If it's a public URL, clean it first
  const cleanPath = getPathFromPublicUrl(bucket, path);

  const { error } = await supabase.storage
    .from(bucket)
    .remove([cleanPath]);

  if (error) {
    console.error(`Error deleting file ${bucket}/${cleanPath}:`, error);
  }
}
