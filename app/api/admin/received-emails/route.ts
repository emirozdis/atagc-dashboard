import { NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import getAuthorization from "@/lib/getAuthorization";
import { ROLES } from "@/lib/roles";
import { supabase } from "@/lib/SERVER_supabase";

async function requireAdmin() {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] });
  if (!auth.ok) throw new Error("Unauthorized");
}

export const GET = apiHandler(async (request: Request) => {
  await requireAdmin();
  const params = new URL(request.url).searchParams;
  const unreadOnly = params.get("unread") === "true";
  const requestedLimit = Number(params.get("limit") || 100);
  const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, Math.floor(requestedLimit))) : 100;

  let query = supabase
    .from("received_emails")
    .select("id, resend_email_id, from_address, to_addresses, subject, message_id, attachments, received_at, is_read")
    .order("received_at", { ascending: false })
    .limit(limit);
  if (unreadOnly) query = query.eq("is_read", false);

  const { data, error } = await query;
  if (error) throw error;
  return NextResponse.json(data || []);
});

export const PATCH = apiHandler(async (request: Request) => {
  await requireAdmin();
  const input = z.object({ id: z.uuid(), isRead: z.boolean() }).parse(await request.json());
  const { error } = await supabase.from("received_emails").update({ is_read: input.isRead, updated_at: new Date().toISOString() }).eq("id", input.id);
  if (error) throw error;
  return NextResponse.json({ success: true });
});
