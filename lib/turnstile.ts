import { headers } from "next/headers";

const SITE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.error("TURNSTILE_SECRET_KEY is not defined");
    // Fail closed in production, maybe open in dev if needed, but safer to fail.
    return false;
  }

  // If we are in development and strictly want to bypass (optional flag)
  if (process.env.NODE_ENV === "development" && process.env.TURNSTILE_BYPASS === "true") {
    console.log("TURNSTILE_BYPASS is true, skipping verification");
    return true;
  }

  if (!token) return false;

  try {
    const ip = (await headers()).get("x-forwarded-for") || "127.0.0.1";

    const formData = new FormData();
    formData.append("secret", secretKey);
    formData.append("response", token);
    formData.append("remoteip", ip);

    const result = await fetch(SITE_VERIFY_URL, {
      body: formData,
      method: "POST",
    });

    const outcome = await result.json();
    return outcome.success;
  } catch (e) {
    console.error("Turnstile verification error:", e);
    return false;
  }
}

// Change Log:
// - Created utility to verify Cloudflare Turnstile tokens server-side.