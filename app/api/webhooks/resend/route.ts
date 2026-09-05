import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/SERVER_supabase";
import { fetchResendReceivedEmail, verifyResendWebhook } from "@/lib/resend-webhook";

export const runtime = "nodejs";

const webhookEnvelopeSchema = z.object({
  type: z.string(),
  created_at: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
}).passthrough();

const receivedEmailEventDataSchema = z.object({
  email_id: z.string().min(1),
  from: z.string().optional(),
  to: z.array(z.string()).optional(),
  subject: z.string().optional(),
  created_at: z.string().optional(),
}).passthrough();

function boundedText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.slice(0, maxLength) : null;
}

function stringList(value: unknown, itemLength = 500) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").slice(0, 100).map((item) => item.slice(0, itemLength));
}

function jsonObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function receivedAt(value: unknown, fallback: unknown) {
  const date = new Date(typeof value === "string" ? value : typeof fallback === "string" ? fallback : "");
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export async function POST(request: Request) {
  const payload = await request.text();
  if (!process.env.RESEND_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "RESEND_WEBHOOK_SECRET is not configured." }, { status: 503 });
  }
  if (!verifyResendWebhook(payload, request.headers)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  const event = webhookEnvelopeSchema.safeParse(parsed);
  if (!event.success) return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  if (event.data.type !== "email.received") return NextResponse.json({ received: true, ignored: true });

  const receivedEventData = receivedEmailEventDataSchema.safeParse(event.data.data);
  if (!receivedEventData.success) return NextResponse.json({ error: "Invalid received email payload." }, { status: 400 });

  const emailId = receivedEventData.data.email_id;
  const { data: existing, error: lookupError } = await supabase
    .from("received_emails")
    .select("id")
    .eq("resend_email_id", emailId)
    .maybeSingle();
  if (lookupError) {
    console.error("Resend webhook archive lookup failed:", lookupError.message);
    return NextResponse.json({ error: "Unable to store received email." }, { status: 500 });
  }
  if (existing) return NextResponse.json({ received: true, duplicate: true });

  try {
    const received = await fetchResendReceivedEmail(emailId);
    const { error } = await supabase.from("received_emails").upsert({
      resend_email_id: emailId,
      webhook_event_id: request.headers.get("svix-id"),
      from_address: boundedText(received.from || receivedEventData.data.from, 500) || "Unknown sender",
      to_addresses: stringList(received.to || receivedEventData.data.to),
      cc_addresses: stringList(received.cc),
      bcc_addresses: stringList(received.bcc),
      reply_to_addresses: stringList(received.reply_to),
      subject: boundedText(received.subject || receivedEventData.data.subject, 500) || "(No subject)",
      text_body: boundedText(received.text, 500_000),
      html_body: boundedText(received.html, 1_000_000),
      headers: jsonObject(received.headers),
      attachments: Array.isArray(received.attachments) ? received.attachments.slice(0, 100) : [],
      message_id: boundedText(received.message_id, 500),
      received_at: receivedAt(received.created_at, receivedEventData.data.created_at || event.data.created_at),
      updated_at: new Date().toISOString(),
    }, { onConflict: "resend_email_id" });
    if (error) throw new Error(error.message);
  } catch (error) {
    console.error("Resend received email archive failed:", error);
    return NextResponse.json({ error: "Unable to archive received email." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
