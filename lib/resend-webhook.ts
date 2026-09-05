import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_TIMESTAMP_SKEW_SECONDS = 5 * 60;

function webhookKey(secret: string) {
  const encoded = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  return Buffer.from(encoded, "base64");
}

export function verifyResendWebhook(payload: string, headers: Headers) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signature = headers.get("svix-signature");

  if (!secret || !id || !timestamp || !signature) return false;
  const timestampSeconds = Number(timestamp);
  if (!Number.isSafeInteger(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > MAX_TIMESTAMP_SKEW_SECONDS) return false;

  const expected = createHmac("sha256", webhookKey(secret))
    .update(`${id}.${timestamp}.${payload}`)
    .digest("base64");
  const expectedBuffer = Buffer.from(expected);

  return signature.split(" ").some((candidate) => {
    const [version, value] = candidate.split(",", 2);
    if (version !== "v1" || !value) return false;
    const candidateBuffer = Buffer.from(value);
    return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
  });
}

export type ResendReceivedEmail = {
  id: string;
  from?: string | null;
  to?: string[] | null;
  cc?: string[] | null;
  bcc?: string[] | null;
  reply_to?: string[] | null;
  subject?: string | null;
  text?: string | null;
  html?: string | null;
  headers?: Record<string, unknown> | null;
  attachments?: Array<Record<string, unknown>> | null;
  message_id?: string | null;
  created_at?: string | null;
};

export async function fetchResendReceivedEmail(emailId: string): Promise<ResendReceivedEmail> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is required to retrieve received email content.");

  const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend receiving API failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  return response.json() as Promise<ResendReceivedEmail>;
}
