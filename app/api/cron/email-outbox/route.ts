import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 25;
const MAX_BATCHES = 4;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workerId = `cron-${Date.now()}`;
  let sent = 0;
  let failed = 0;

  for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
    const { data: messages, error } = await supabase.rpc("claim_ravenmun_email_outbox", {
      p_limit: BATCH_SIZE,
      p_worker: workerId,
    });
    if (error) {
      console.error("Email outbox claim failed:", error);
      return NextResponse.json({ error: "Unable to claim outbox messages", sent, failed }, { status: 500 });
    }
    if (!messages?.length) break;

    for (const message of messages as Array<{ id: string; recipient_email: string; subject: string; html: string; attempts?: number }>) {
      try {
        await sendEmail(message.recipient_email, message.subject, message.html);
        await supabase
          .from("email_outbox")
          .update({ sent_at: new Date().toISOString(), locked_at: null, locked_by: null, last_error: null })
          .eq("id", message.id)
          .eq("locked_by", workerId);
        sent += 1;
      } catch (error) {
        failed += 1;
        const attempts = Number(message.attempts || 0) + 1;
        const delayMinutes = Math.min(60, 2 ** Math.min(attempts, 6));
        await supabase
          .from("email_outbox")
          .update({
            attempts,
            available_at: new Date(Date.now() + delayMinutes * 60 * 1000).toISOString(),
            locked_at: null,
            locked_by: null,
            last_error: error instanceof Error ? error.message : String(error),
          })
          .eq("id", message.id)
          .eq("locked_by", workerId);
      }
    }
  }

  return NextResponse.json({ sent, failed });
}
