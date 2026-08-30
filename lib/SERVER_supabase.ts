import "server-only";

import { createClient } from "@supabase/supabase-js";
import { fromPrisma, rpcPrisma } from "@/lib/prisma-query";

type StorageClient = ReturnType<typeof createClient>;
let storageClient: StorageClient | null = null;

function getStorageClient(): StorageClient {
  if (storageClient) return storageClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase Storage requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY");
  }

  storageClient = createClient(url, key);
  return storageClient;
}

/**
 * Server database facade. Table reads/writes and RPC calls use Prisma only.
 * The Supabase client is lazy and is retained solely for Storage operations.
 */
export const supabase = {
  from: fromPrisma,
  rpc: rpcPrisma,
  storage: {
    from: (...args: Parameters<StorageClient["storage"]["from"]>) => getStorageClient().storage.from(...args),
  },
};
