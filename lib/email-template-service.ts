import "server-only";

import { supabase } from "@/lib/SERVER_supabase";
import {
  CUSTOMIZABLE_NOTIFICATION_TYPES,
  CustomizableNotificationType,
  NotificationType,
  StoredEmailTemplate,
} from "@/lib/email-templates";

const TEMPLATE_COLUMNS = "notification_type, subject, heading, body_html, button_text, button_path, accent_color, is_enabled";

export async function getStoredEmailTemplate(type: NotificationType): Promise<StoredEmailTemplate | null> {
  const { data, error } = await supabase
    .from("email_templates")
    .select(TEMPLATE_COLUMNS)
    .eq("notification_type", type)
    .maybeSingle();

  // Templates are an optional customization layer. The hard-coded defaults
  // keep notifications working during deployment before the migration runs.
  if (error || !data) return null;
  return data as unknown as StoredEmailTemplate;
}

export function isCustomizableNotificationType(value: string): value is CustomizableNotificationType {
  return CUSTOMIZABLE_NOTIFICATION_TYPES.includes(value as CustomizableNotificationType);
}
