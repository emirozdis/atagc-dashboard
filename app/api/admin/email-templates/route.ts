import { NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import getAuthorization from "@/lib/getAuthorization";
import { ROLES } from "@/lib/roles";
import { sanitizeHtml } from "@/lib/sanitize";
import {
  CUSTOMIZABLE_NOTIFICATION_TYPES,
  CustomizableNotificationType,
  getDefaultEmailTemplate,
} from "@/lib/email-templates";
import { supabase } from "@/lib/SERVER_supabase";
import { Logger } from "@/lib/logger";

const notificationTypeSchema = z.enum(CUSTOMIZABLE_NOTIFICATION_TYPES as unknown as [string, ...string[]]);
const templateSchema = z.object({
  notificationType: notificationTypeSchema,
  subject: z.string().trim().min(2).max(180).refine((value) => !/[\r\n]/.test(value), "Subject cannot contain line breaks."),
  heading: z.string().trim().min(2).max(180),
  bodyHtml: z.string().trim().min(2).max(30000),
  buttonText: z.string().trim().max(100).nullable(),
  buttonPath: z.string().trim().max(500).nullable().refine((value) => !value || value.startsWith("/") || /^https?:\/\//i.test(value) || /^\{\{\s*(link|portal_url)\s*\}\}$/i.test(value), "Button link must be a site path, HTTPS URL, or supported variable."),
  accentColor: z.string().regex(/^#[0-9a-f]{6}$/i, "Accent color must be a six-digit hex color.").nullable(),
  isEnabled: z.boolean(),
}).refine((value) => !["application_status", "magic_link_invite", "email_verification"].includes(value.notificationType) || value.isEnabled, "Critical authentication and application emails cannot be disabled.");

const types = CUSTOMIZABLE_NOTIFICATION_TYPES as readonly CustomizableNotificationType[];

async function requireAdmin() {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  return auth.session;
}

export const GET = apiHandler(async () => {
  await requireAdmin();
  const { data, error } = await supabase
    .from("email_templates")
    .select("notification_type, subject, heading, body_html, button_text, button_path, accent_color, is_enabled")
    .in("notification_type", [...types]);
  if (error && !error.message.toLowerCase().includes("does not exist")) throw error;

  const stored = new Map((data || []).map((template) => [template.notification_type, template]));
  return NextResponse.json(types.map((type) => ({
    ...getDefaultEmailTemplate(type),
    ...(stored.get(type) || {}),
  })));
});

export const PUT = apiHandler(async (request: Request) => {
  const session = await requireAdmin();
  const input = templateSchema.parse(await request.json());
  const bodyHtml = sanitizeHtml(input.bodyHtml);

  const { error } = await supabase.from("email_templates").upsert({
    notification_type: input.notificationType,
    subject: input.subject,
    heading: input.heading,
    body_html: bodyHtml,
    button_text: input.buttonText || null,
    button_path: input.buttonPath || null,
    accent_color: input.accentColor || null,
    is_enabled: input.isEnabled,
    updated_by: session.user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "notification_type" });
  if (error) throw error;

  await Logger.audit(
    { userId: session.user.id, req: request },
    {
      action: "update_email_template",
      category: "system",
      resourceType: "email_template",
      resourceId: input.notificationType,
      metadata: { notification_type: input.notificationType, enabled: input.isEnabled },
    },
  );

  return NextResponse.json({ success: true });
});

export const DELETE = apiHandler(async (request: Request) => {
  const session = await requireAdmin();
  const type = notificationTypeSchema.parse(new URL(request.url).searchParams.get("type"));
  const { error } = await supabase.from("email_templates").delete().eq("notification_type", type);
  if (error) throw error;

  await Logger.audit(
    { userId: session.user.id, req: request },
    {
      action: "reset_email_template",
      category: "system",
      resourceType: "email_template",
      resourceId: type,
    },
  );

  return NextResponse.json({ success: true });
});
