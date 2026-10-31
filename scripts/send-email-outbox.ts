// Drains public.email_outbox through the shared email sender.
//
// Usage (from the repository root):
//   pnpm exec ts-node --project tests/tsconfig.json scripts/send-email-outbox.ts
//
// The worker script uses lib/email, which tries the primary Resend key first
// and falls back to RESEND_FALLBACK_API_KEY / EMAIL_FALLBACK_FROM.

import { config } from "dotenv";
import path from "node:path";
import { Client } from "pg";

config({ path: path.join(process.cwd(), ".env") });
config({ path: path.join(process.cwd(), ".env.local"), override: true });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("DIRECT_URL or DATABASE_URL is required.");

const workerId = `manual-outbox-${Date.now()}`;
const batchSize = Number(process.env.EMAIL_OUTBOX_BATCH_SIZE || 25);

async function main() {
  const { sendEmail } = await import("../lib/email");
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  let sent = 0;
  let failed = 0;
  try {
    for (;;) {
      const { rows } = await client.query(
        "select * from public.claim_ravenmun_email_outbox($1, $2)",
        [batchSize, workerId],
      );
      if (!rows.length) break;
      for (const message of rows) {
        try {
          await sendEmail(message.recipient_email, message.subject, message.html);
          await client.query(
            "update public.email_outbox set sent_at = now(), locked_at = null, locked_by = null, last_error = null where id = $1 and locked_by = $2",
            [message.id, workerId],
          );
          sent += 1;
        } catch (error) {
          failed += 1;
          const messageText = error instanceof Error ? error.message : String(error);
          await client.query(
            "update public.email_outbox set attempts = attempts + 1, available_at = now() + interval '10 minutes', locked_at = null, locked_by = null, last_error = $3 where id = $1 and locked_by = $2",
            [message.id, workerId, messageText],
          );
          console.error(`Failed outbox message ${message.id}: ${messageText}`);
        }
      }
      console.log(`outbox progress: sent=${sent} failed=${failed}`);
    }
  } finally {
    await client.end();
  }
  console.log(`outbox drained: sent=${sent} failed=${failed}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
