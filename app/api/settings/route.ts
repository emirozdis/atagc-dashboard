import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(60, ip);

  const { data: records, error } = await supabase
      .from("system_settings")
      .select("term_name, contact_email, location, event_start_date, event_end_date, bank_name, bank_account_holder, bank_iban")
      .limit(1);

  const defaults = {
      term_name: "ATAGÇ",
      contact_email: "info@atagc.com.tr",
      location: "İTÜ GVO İzmir NESAN Yerleşkesi",
      event_start_date: null,
      event_end_date: null,
      bank_name: "Ziraat Bankası",
      bank_account_holder: "ATAGÇ Komitesi",
      bank_iban: "TR00 0000 0000 0000 0000 0000 00"
  };

  if (error || !records || records.length === 0) {
      return NextResponse.json(defaults);
  }

  const data = records[0];

  return NextResponse.json({
      term_name: data.term_name ?? defaults.term_name,
      contact_email: data.contact_email ?? defaults.contact_email,
      location: data.location ?? defaults.location,
      event_start_date: data.event_start_date,
      event_end_date: data.event_end_date,
      bank_name: data.bank_name ?? defaults.bank_name,
      bank_account_holder: data.bank_account_holder ?? defaults.bank_account_holder,
      bank_iban: data.bank_iban ?? defaults.bank_iban,
  });
}