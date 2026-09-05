import { supabase } from "@/lib/SERVER_supabase";
import { sendEmail } from "@/lib/email";
import { EmailData, NotificationType, renderEmailTemplate } from "@/lib/email-templates";
import { getStoredEmailTemplate } from "@/lib/email-template-service";
import { getSiteUrl } from "@/lib/site-url";

export async function sendSystemNotification(
  userId: string,
  type: NotificationType,
  data: EmailData = {},
) {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select(`
        full_name, 
        email, 
        user_details ( notification_preferences )
      `)
      .eq("id", userId)
      .single();

    if (error || !user) {
      console.error("[Notification] User fetch failed:", userId);
      return;
    }

    const email = user.email;
    const name = user.full_name;
    const details = Array.isArray(user.user_details) ? user.user_details[0] : user.user_details;
    
    const prefs = details?.notification_preferences || {
      application: true,
      committee: true,
      social: true,
      system: true
    };

    let shouldSend = false;

    switch (type) {
      case "application_received":
      case "payment_approved": // Payments fall under application updates
      case "payment_rejected":
        shouldSend = prefs.application !== false;
        break;

      case "application_status":
        // Application decisions are essential account communication and are
        // sent even when optional application notifications are disabled.
        shouldSend = true;
        break;
      
      case "committee_assignment":
        shouldSend = prefs.committee !== false;
        break;

      case "connection_request":
      case "connection_accepted":
        shouldSend = prefs.social !== false;
        break;

      case "warning_issued":
        shouldSend = prefs.system !== false;
        break;

      case "account_suspended":
      case "password_changed":
        shouldSend = true;
        break;
    }

    if (!shouldSend) return;

    const template = await getStoredEmailTemplate(type);
    if (template?.is_enabled === false && type !== "application_status") return;

    const rendered = renderEmailTemplate(type, name, getSiteUrl(), data, template);

    try {
      await sendEmail(email, rendered.subject, rendered.html);
    } catch (deliveryError) {
      // Status changes and other critical notifications must not disappear if
      // Resend is temporarily unavailable. The worker can retry this record.
      const { error: queueError } = await supabase.from("email_outbox").insert({
        recipient_email: email,
        recipient_name: name,
        subject: rendered.subject,
        html: rendered.html,
      });
      if (queueError) console.error("[Notification] Failed to queue retry:", queueError);
      console.error("[Notification] Email delivery failed; queued for retry:", deliveryError);
    }

  } catch (error) {
    console.error("[Notification] Failed to send:", error);
  }
}

// Change Log:
// - Mapped `payment_approved` and `payment_rejected` to the 'application' preference category.
