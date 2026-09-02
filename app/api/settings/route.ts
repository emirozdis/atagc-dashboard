import { NextResponse } from "next/server";
import { RAVENMUN_CONFERENCE } from "@/config/ravenmun";
import { supabase } from "@/lib/SERVER_supabase";
import { rateLimit } from "@/lib/rate-limit";
import getAuthorization from "@/lib/getAuthorization";
import { STAFF_ROLES } from "@/lib/roles";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(60, ip);

  const auth = await getAuthorization({ requireAuth: false });
  const session = auth.session;
  const canSeePaymentDetails = Boolean(
    session?.user &&
      (session.user.applicationStatus === "approved" || STAFF_ROLES.includes(session.user.role as never)),
  );

  const { data: records } = await supabase
    .from("system_settings")
    .select("term_name, contact_email, location, event_start_date, event_end_date, bank_name, bank_account_holder, bank_iban")
    .limit(1);

  const defaults = {
    term_name: "RavenMUN 2026",
    contact_email: RAVENMUN_CONFERENCE.email,
    location: RAVENMUN_CONFERENCE.venue,
    event_start_date: null,
    event_end_date: null,
    bank_name: "Conference payment account",
    bank_account_holder: "RavenMUN Organizing Committee",
    bank_iban: "TR00 0000 0000 0000 0000 0000 00",
  };
  const data = records?.[0] || defaults;

  return NextResponse.json({
    term_name: data.term_name ?? defaults.term_name,
    contact_email: data.contact_email ?? defaults.contact_email,
    location: data.location ?? defaults.location,
    event_start_date: data.event_start_date ?? defaults.event_start_date,
    event_end_date: data.event_end_date ?? defaults.event_end_date,
    bank_name: canSeePaymentDetails ? (data.bank_name ?? defaults.bank_name) : null,
    bank_account_holder: canSeePaymentDetails ? (data.bank_account_holder ?? defaults.bank_account_holder) : null,
    bank_iban: canSeePaymentDetails ? (data.bank_iban ?? defaults.bank_iban) : null,
  });
}
