import { headers } from "next/headers";

const SITE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.error("❌ Turnstile Error: TURNSTILE_SECRET_KEY is not defined in environment variables.");
    return false;
  }

  // Optional bypass for local development
  if (process.env.NODE_ENV === "development" && process.env.TURNSTILE_BYPASS === "true") {
    console.log("⚠️ Turnstile bypassed via env var.");
    return true;
  }

  if (!token) {
    console.error("❌ Turnstile Error: No token provided for verification.");
    return false;
  }

  try {
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    // Ensure we only send the first IP if multiple are present (Client IP)
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : "127.0.0.1";

    const formData = new FormData();
    formData.append("secret", secretKey);
    formData.append("response", token);
    formData.append("remoteip", ip);

    const result = await fetch(SITE_VERIFY_URL, {
      body: formData,
      method: "POST",
    });

    const outcome = await result.json();

    if (!outcome.success) {
      console.error("❌ Turnstile Verification Failed. Error Codes:", outcome['error-codes']);
      // invalid-input-secret: Check your TURNSTILE_SECRET_KEY in .env
      // invalid-input-response: The token sent from frontend is invalid/expired
      return false;
    }

    return true;
  } catch (e) {
    console.error("❌ Turnstile Network/System Error:", e);
    return false;
  }
}

// Change Log:
// - Added logic to parse the primary IP from `x-forwarded-for` to prevent format errors.
// - Added explicit error logging for missing secrets and Cloudflare error codes.