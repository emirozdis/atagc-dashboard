import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import getAuthorization from "@/lib/getAuthorization";
import { ROLES } from "@/lib/roles";
import { supabase } from "@/lib/SERVER_supabase";
import { sanitizeHtml } from "@/lib/sanitize";

export const GET = apiHandler(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] });
  if (!auth.ok) throw new Error("Unauthorized");
  const { id } = await params;
  const { data, error } = await supabase
    .from("received_emails")
    .select("id, resend_email_id, from_address, to_addresses, cc_addresses, bcc_addresses, reply_to_addresses, subject, text_body, html_body, headers, attachments, message_id, received_at, is_read")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return NextResponse.json({ error: "Received email not found." }, { status: 404 });

  if (!data.is_read) {
    await supabase.from("received_emails").update({ is_read: true, updated_at: new Date().toISOString() }).eq("id", id);
  }

  return NextResponse.json({
    ...data,
    html_body: data.html_body ? sanitizeHtml(data.html_body) : null,
  });
});
