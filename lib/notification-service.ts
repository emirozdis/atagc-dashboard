import { supabase } from "@/lib/SERVER_supabase";
import { sendEmail } from "@/lib/email";
import { NotificationType, generateEmailHtml } from "@/lib/email-templates";

const BASE_URL = process.env.NEXTAUTH_URL || "https://ravenmun.org";

export async function sendSystemNotification(
  userId: string,
  type: NotificationType
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
      case "application_status":
      case "payment_approved": // Payments fall under application updates
      case "payment_rejected":
        shouldSend = prefs.application !== false;
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

    const html = generateEmailHtml(type, name, BASE_URL);
    const subject = extractSubject(html); 

    await sendEmail(email, subject, html);
    console.log(`[Notification] Sent ${type} to ${email}`);

  } catch (error) {
    console.error("[Notification] Failed to send:", error);
  }
}

function extractSubject(html: string): string {
  const match = html.match(/<title>(.*?)<\/title>/);
  return match ? match[1] : "RavenMUN notification";
}

// Change Log:
// - Mapped `payment_approved` and `payment_rejected` to the 'application' preference category.
