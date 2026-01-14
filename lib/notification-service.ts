import { supabase } from "@/lib/SERVER_supabase";
import { sendEmail } from "@/lib/email";
import { NotificationType, generateEmailHtml } from "@/lib/email-templates";

const BASE_URL = process.env.NEXTAUTH_URL || "https://panel.atagc.com.tr";

/**
 * Sends a system notification email if the user has enabled the corresponding preference.
 * Security alerts (password, suspension) bypass preferences.
 */
export async function sendSystemNotification(
  userId: string,
  type: NotificationType
) {
  try {
    // 1. Fetch user email and preferences
    // We use a safe join. If user_details is missing, it returns empty array/null.
    const { data: user, error } = await supabase
      .from("users")
      .select(`
        full_name, 
        email, 
        user_details ( notification_preferences )
      `)
      .eq("id", userId)
      .single();

    if (error) {
      console.error("[Notification] Database Error:", error.message);
      return;
    }

    if (!user) {
      console.error("[Notification] User not found:", userId);
      return;
    }

    const email = user.email;
    const name = user.full_name;
    const details = Array.isArray(user.user_details) ? user.user_details[0] : user.user_details;
    
    // Default preferences if null (e.g., user hasn't saved settings yet or user_details missing)
    const prefs = details?.notification_preferences || {
      application: true,
      committee: true,
      social: true,
      system: true
    };

    // 2. Check Preferences
    let shouldSend = false;

    switch (type) {
      case "application_received":
      case "application_status":
        shouldSend = prefs.application !== false; // Default true
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

      // Mandatory Emails (Security/Critical) - These ignore preferences
      case "account_suspended":
      case "password_changed":
        shouldSend = true;
        break;
    }

    if (!shouldSend) {
      // console.log(`[Notification] Skipped ${type} for ${email} due to preferences.`);
      return; 
    }

    // 3. Generate Content
    // Changed to pass BASE_URL only, allowing template to handle routing logic
    const html = generateEmailHtml(type, name, BASE_URL);
    const subject = extractSubject(html); 

    // 4. Send
    await sendEmail(email, subject, html);
    console.log(`[Notification] Sent ${type} to ${email}`);

  } catch (error) {
    console.error("[Notification] Failed to send:", error);
    // Silent fail to not block main API flow
  }
}

function extractSubject(html: string): string {
  const match = html.match(/<title>(.*?)<\/title>/);
  return match ? match[1] : "ATAGÇ Bildirim";
}

// Change Log:
// - Updated `generateEmailHtml` call to pass `BASE_URL` instead of `${BASE_URL}/dashboard`.
// - This allows the email template logic to decide specific paths (e.g., /dashboard/committee) accurately.