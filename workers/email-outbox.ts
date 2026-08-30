import { randomUUID } from "node:crypto";
import { sendEmail } from "../lib/email";
import { supabase } from "../lib/SERVER_supabase";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to run the email outbox worker.");

const workerId = `ravenmun-${randomUUID()}`;
const batchSize = Number(process.env.EMAIL_OUTBOX_BATCH_SIZE || 25);

async function processBatch() {
  const { data: messages, error } = await supabase.rpc("claim_ravenmun_email_outbox", { p_limit: batchSize, p_worker: workerId });
  if (error) throw error;
  for (const message of messages || []) {
    try {
      await sendEmail(message.recipient_email, message.subject, message.html);
      await supabase.from("email_outbox").update({ sent_at: new Date().toISOString(), locked_at: null, locked_by: null, last_error: null }).eq("id", message.id).eq("locked_by", workerId);
    } catch (error) {
      const attempts = Number(message.attempts || 0) + 1;
      const delayMinutes = Math.min(60, 2 ** Math.min(attempts, 6));
      await supabase.from("email_outbox").update({ attempts, available_at: new Date(Date.now() + delayMinutes * 60 * 1000).toISOString(), locked_at: null, locked_by: null, last_error: error instanceof Error ? error.message : String(error) }).eq("id", message.id).eq("locked_by", workerId);
    }
  }
}

async function main() {
  if (!process.env.RESEND_API_KEY && (!process.env.SMTP_USER || !process.env.SMTP_PASS)) {
    throw new Error("Resend or SMTP credentials are required to run the email outbox worker.");
  }
  await processBatch();
  setInterval(() => processBatch().catch((error) => console.error("RavenMUN email outbox error", error)), Number(process.env.EMAIL_OUTBOX_INTERVAL_MS || 5000));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
