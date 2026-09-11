import { LRUCache } from "lru-cache";
import crypto from "node:crypto";

type Options = {
  uniqueTokenPerInterval?: number;
  interval?: number;
  namespace?: string;
};

export function rateLimit(options?: Options) {
  const tokenCache = new LRUCache({
    max: options?.uniqueTokenPerInterval || 500,
    ttl: options?.interval || 60000,
  });

  return {
    check: async (limit: number, token: string) => {
      const production = process.env.NODE_ENV === "production";
      const allowMemoryFallback = process.env.RATE_LIMIT_ALLOW_MEMORY_FALLBACK === "true";
      const intervalSeconds = Math.max(1, Math.ceil((options?.interval || 60000) / 1000));
      const tokenKey = `${options?.namespace || "default"}:${token}`;
      const key = `ravenmun:rate:${crypto.createHash("sha256").update(tokenKey).digest("hex")}`;

      try {
        const { supabase } = await import("@/lib/SERVER_supabase");
        const { data, error } = await supabase.rpc<boolean>("consume_ravenmun_rate_limit", {
          p_key: key,
          p_limit: limit,
          p_window_seconds: intervalSeconds,
        });

        if (!error && data === false) throw new Error("Rate limit exceeded");
        if (!error && data === true) return;
        if (production && !allowMemoryFallback) throw new Error("Rate limit service unavailable.");
      } catch (error) {
        if (error instanceof Error && error.message === "Rate limit exceeded") throw error;
        if (production && !allowMemoryFallback) throw new Error("Rate limit service unavailable.");
      }

      await new Promise<void>((resolve, reject) => {
        const tokenCount = (tokenCache.get(token) as number[]) || [0];
        if (tokenCount[0] === 0) {
          tokenCache.set(token, [1]);
        } else {
          tokenCount[0] += 1;
          tokenCache.set(token, tokenCount);
        }
        const currentUsage = tokenCount[0];
        const isRateLimited = currentUsage > limit;
        
        if (isRateLimited) {
          reject(new Error("Rate limit exceeded"));
        } else {
          resolve();
        }
      });
    },
  };
}

/* Change Log:
- Implemented in-memory Token Bucket rate limiting using LRUCache.
- Configurable limits and intervals.
*/
