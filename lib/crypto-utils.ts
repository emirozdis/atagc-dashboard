import crypto from "node:crypto";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hmacSha256(secret: string, value: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export function hashEmailVerificationCode(secret: string, email: string, code: string) {
  return hmacSha256(secret, `email-verification:${normalizeEmail(email)}:${code}`);
}

export function hashPasswordlessCode(secret: string, email: string, purpose: string, code: string) {
  return hmacSha256(secret, `${purpose}:${normalizeEmail(email)}:${code}`);
}

export function hashOpaqueToken(secret: string, token: string) {
  return hmacSha256(secret, token);
}

export function timingSafeEqualStrings(expectedValue: string, receivedValue: string) {
  const expected = Buffer.from(expectedValue, "utf8");
  const received = Buffer.from(receivedValue, "utf8");
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

export function createOpaqueToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function createOtp() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function qrSignature(secret: string, payload: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createParticipantQrPayload(secret: string, userId: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ t: "ravenmun-participant", id: userId, exp: now + 5 * 60 * 1000 }), "utf8").toString("base64url");
  return JSON.stringify({ p: payload, s: qrSignature(secret, payload) });
}

export function verifyParticipantQrPayload(secret: string, value: string, now = Date.now()) {
  try {
    const parsed = JSON.parse(value) as { p?: string; s?: string };
    if (!parsed.p || !parsed.s || !timingSafeEqualStrings(qrSignature(secret, parsed.p), parsed.s)) return null;
    const payload = JSON.parse(Buffer.from(parsed.p, "base64url").toString("utf8")) as { t?: string; id?: string; exp?: number };
    if (payload.t !== "ravenmun-participant" || !payload.id || !payload.exp || payload.exp < now) return null;
    return payload.id;
  } catch {
    return null;
  }
}
