// Rebuilds and sends the application-decision emails that were queued after
// the Resend quota was exhausted. The queued HTML is intentionally ignored:
// the current application status and fee are used instead.
//
// Usage (from the repository root):
//   pnpm exec ts-node --project tests/tsconfig.json scripts/resend-application-updates.ts
//   pnpm exec ts-node --project tests/tsconfig.json scripts/resend-application-updates.ts --apply

import { config } from "dotenv";
import path from "node:path";
import { Client } from "pg";

config({ path: path.join(process.cwd(), ".env") });
config({ path: path.join(process.cwd(), ".env.local"), override: true });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("DIRECT_URL or DATABASE_URL is required.");

const apply = process.argv.includes("--apply");
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "https://ravenmun.com";
const subject = "Application update | RavenMUN 2026";
const applicationIdPattern = /applicationId=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
const decisionStatuses = new Set(["accepted", "approved", "rejected", "waitlist"]);
const QA_APPLICATION_ID = "e2730452-0651-4b13-abbd-ae6867edb344";

type Row = { id: string; recipient_email: string; html: string };

function statusHint(html: string): string[] | null {
  if (/Participation fee|Complete payment/.test(html)) return ["accepted", "approved"];
  if (/Waitlisted/.test(html)) return ["waitlist"];
  if (/Not accepted<|>Rejected</.test(html)) return ["rejected"];
  return null;
}

async function main() {
  const { sendEmail } = await import("../lib/email");
  const { renderEmailTemplate } = await import("../lib/email-templates");
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  let sent = 0;
  let skipped = 0;
  try {
    const { rows: outbox } = await client.query<Row>(
      "select id, recipient_email, html from public.email_outbox where sent_at is null and subject = $1 order by created_at asc",
      [subject],
    );

    const byApplication = new Map<string, { rowIds: string[]; recipient: string }>();
    for (const row of outbox) {
      const directMatch = row.html.match(applicationIdPattern);
      let applicationId = directMatch?.[1]?.toLowerCase() || null;

      if (!applicationId) {
        const hint = statusHint(row.html);
        const { rows: users } = await client.query<{ id: string }>(
          "select id from public.users where lower(email) = lower($1) limit 1",
          [row.recipient_email],
        );
        if (!users[0]) {
          skipped += 1;
          continue;
        }
        const { rows: apps } = await client.query<{ id: string }>(
          `select id from public.applications
           where user_id = $1 and status = any($2::text[])
           order by reviewed_at desc nulls last, submitted_at desc limit 1`,
          [users[0].id, hint || [...decisionStatuses]],
        );
        if (!apps[0]) {
          skipped += 1;
          continue;
        }
        applicationId = apps[0].id;
      }

      const current = byApplication.get(applicationId) || { rowIds: [], recipient: row.recipient_email };
      current.rowIds.push(row.id);
      byApplication.set(applicationId, current);
    }

    for (const [applicationId, entry] of byApplication) {
      if (applicationId === QA_APPLICATION_ID) {
        skipped += 1;
        continue;
      }
      const { rows: applications } = await client.query<{
        id: string;
        application_type: string;
        status: string;
        review_notes: string | null;
        form_snapshot: { fee?: number } | null;
        email: string;
        full_name: string | null;
      }>(
        `select a.id, a.application_type, a.status, a.review_notes, a.form_snapshot,
                u.email, u.full_name
         from public.applications a
         join public.users u on u.id = a.user_id
         where a.id = $1`,
        [applicationId],
      );
      const application = applications[0];
      if (!application || !decisionStatuses.has(application.status)) {
        skipped += 1;
        continue;
      }

      const { rowCount } = await client.query(
        "select 1 from public.email_outbox where sent_at is not null and html ilike $1 limit 1",
        [`%${applicationId}%`],
      );
      if (rowCount) {
        skipped += 1;
        console.log(`already sent: ${application.email} ${application.application_type} ${application.status}`);
        continue;
      }

      const { rows: reviewRows } = await client.query<{ previous_status: string | null }>(
        `select details->'changes'->'status'->>'from' as previous_status
         from public.logs
         where action = 'update_application_status' and resource_id = $1
         order by created_at desc limit 1`,
        [applicationId],
      );
      const previousStatus = reviewRows[0]?.previous_status || "under_review";
      const fee = Number(application.form_snapshot?.fee || 0);
      const rendered = renderEmailTemplate(
        "application_status",
        application.full_name || application.email,
        siteUrl,
        {
          applicationId,
          applicationType: application.application_type,
          previousStatus,
          status: application.status,
          reviewNotes: application.review_notes || undefined,
          fee,
        },
      );

      console.log(`${apply ? "SEND" : "DRY"} ${application.email} ${application.application_type} ${application.status} fee=${fee} rows=${entry.rowIds.length}`);
      if (!apply) continue;

      await sendEmail(application.email, rendered.subject, rendered.html);
      await client.query(
        "update public.email_outbox set sent_at = now(), locked_at = null, locked_by = null, last_error = null where id = any($1::uuid[])",
        [entry.rowIds],
      );
      sent += 1;
    }

    if (apply) {
      // The "application received" queued mail is obsolete once the decision
      // mail has been regenerated and sent.
      await client.query(
        "update public.email_outbox set sent_at = now(), locked_at = null, locked_by = null, last_error = 'superseded by decision email' where sent_at is null and subject = 'Application received | RavenMUN 2026'",
      );
    }
    console.log(`done: sent=${sent} skipped=${skipped} mode=${apply ? "apply" : "dry-run"}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
