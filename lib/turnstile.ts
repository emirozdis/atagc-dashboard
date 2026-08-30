import "server-only";

import { headers } from "next/headers";

const SITE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(token: string, request?: Request): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.error("Turnstile verification is unavailable: TURNSTILE_SECRET_KEY is not defined.");
    return false;
  }

  if (!token) {
    console.error("Turnstile verification failed: no token was provided.");
    return false;
  }

  try {
    const requestHeaders = request?.headers || await headers();
    const forwardedFor = requestHeaders.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || requestHeaders.get("cf-connecting-ip") || undefined;

    const formData = new FormData();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (ip) formData.append("remoteip", ip);

    const result = await fetch(SITE_VERIFY_URL, {
      body: formData,
      method: "POST",
      cache: "no-store",
    });

    if (!result.ok) {
      console.error("Turnstile verification request failed with status:", result.status);
      return false;
    }

    const outcome = await result.json();
    if (!outcome.success) {
      console.error("Turnstile verification failed:", outcome["error-codes"]);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Turnstile verification request failed:", error);
    return false;
  }
}
