import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { rateLimit } from "@/lib/rate-limit";
import getAuthorization from "@/lib/getAuthorization";
import { STAFF_ROLES } from "@/lib/roles";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(60, ip);

  // Check auth status without blocking unauthenticated requests
  const auth = await getAuthorization({ requireAuth: false });
  const session = auth.session;

  // Determine if the user is allowed to see sensitive payment details
  let canSeePaymentDetails = false;
  if (session?.user) {
    const role = session.user.role;
    const appStatus = session.user.applicationStatus;
    
    // Allow if they are explicitly approved or hold a staff role (admin, chair, etc.)
    if (appStatus === 'approved' || STAFF_ROLES.includes(role as any)) {
        canSeePaymentDetails = true;
    }
  }

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

  const data = (records && records.length > 0) ? records[0] : defaults;

  return NextResponse.json({
      term_name: data.term_name ?? defaults.term_name,
      contact_email: data.contact_email ?? defaults.contact_email,
      location: data.location ?? defaults.location,
      event_start_date: data.event_start_date ?? defaults.event_start_date,
      event_end_date: data.event_end_date ?? defaults.event_end_date,
      
      // Mask payment details if not authorized
      bank_name: canSeePaymentDetails ? (data.bank_name ?? defaults.bank_name) : null,
      bank_account_holder: canSeePaymentDetails ? (data.bank_account_holder ?? defaults.bank_account_holder) : null,
      bank_iban: canSeePaymentDetails ? (data.bank_iban ?? defaults.bank_iban) : null,
  });
}