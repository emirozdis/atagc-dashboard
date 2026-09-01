import { LRUCache } from "lru-cache";
import crypto from "node:crypto";

type Options = {
  uniqueTokenPerInterval?: number;
  interval?: number;
};

export function rateLimit(options?: Options) {
  const tokenCache = new LRUCache({
    max: options?.uniqueTokenPerInterval || 500,
    ttl: options?.interval || 60000,
  });

  return {
    check: async (limit: number, token: string) => {
      const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
      const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
      const production = process.env.NODE_ENV === "production";
      const allowMemoryFallback = process.env.RATE_LIMIT_ALLOW_MEMORY_FALLBACK === "true";

      if (production && !allowMemoryFallback && (!redisUrl || !redisToken)) {
        throw new Error("Shared rate limiting is not configured.");
      }

      if (redisUrl && redisToken) {
        try {
          const key = `ravenmun:rate:${crypto.createHash("sha256").update(token).digest("hex")}`;
          const headers = { Authorization: `Bearer ${redisToken}` };
          const requestOptions = { headers, signal: AbortSignal.timeout(2500) };
          const response = await fetch(`${redisUrl}/incr/${encodeURIComponent(key)}`, requestOptions);
          if (!response.ok) throw new Error("Rate limit service unavailable.");
          const result = await response.json() as { result?: number };
          if (result.result === 1) {
            const expiry = await fetch(`${redisUrl}/expire/${encodeURIComponent(key)}/${Math.max(1, Math.ceil((options?.interval || 60000) / 1000))}`, requestOptions);
            if (!expiry.ok) throw new Error("Rate limit service unavailable.");
          }
          if (Number(result.result || 0) > limit) throw new Error("Rate limit exceeded");
          return;
        } catch (error) {
          if (error instanceof Error && error.message === "Rate limit exceeded") throw error;
          if (production && !allowMemoryFallback) throw new Error("Rate limit service unavailable.");
        }
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
