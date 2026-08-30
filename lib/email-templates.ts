export type NotificationType =
  | "application_received"
  | "application_status"
  | "committee_assignment"
  | "connection_request"
  | "connection_accepted"
  | "warning_issued"
  | "account_suspended"
  | "password_changed"
  | "payment_approved"
  | "payment_rejected"
  | "email_verification"
  | "magic_link_invite"
  | "password_reset_request"
  | "two_factor_code";

interface EmailContent {
  subject: string;
  heading: string;
  message: string;
  buttonText?: string;
  buttonPath?: string;
  accentColor?: string;
}

interface EmailData {
  code?: string;
  link?: string;
}

const COLORS = {
  background: "#0c0a12",
  container: "#171321",
  textPrimary: "#f4f1ff",
  textSecondary: "#c4bfd4",
  border: "#3a3152",
  primary: "#9b7bda",
  accent: "#d6c7f5",
  danger: "#f18baf",
  success: "#8ed9c0",
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>'\"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '\"': "&quot;",
  })[character] || character);

const getContent = (type: NotificationType, userName: string, data: EmailData = {}): EmailContent => {
  const name = escapeHtml(userName || "Participant");
  const code = escapeHtml(data.code || "");

  switch (type) {
    case "email_verification":
    case "two_factor_code":
      return {
        subject: `Sign-in verification code | RavenMUN 2026`,
        heading: "Your verification code",
        message: `Hello <strong>${name}</strong>,<br/><br/>Use the one-time code below to continue signing in. It expires shortly and can only be used once.<br/><br/><div style=\"background:#211b30;border:1px solid ${COLORS.border};border-radius:10px;padding:16px;font-size:28px;font-weight:700;letter-spacing:5px;text-align:center;color:${COLORS.accent};margin:24px 0;\">${code}</div>`,
        accentColor: COLORS.primary,
      };
    case "magic_link_invite":
      return {
        subject: "Delegation invitation | RavenMUN 2026",
        heading: "You have been invited to a delegation",
        message: `Hello,<br/><br/><strong>${name}</strong> invited you to join their RavenMUN delegation. Use the button below to review the invitation and join the team.`,
        buttonText: "Review invitation",
        buttonPath: data.link,
        accentColor: COLORS.primary,
      };
    case "password_reset_request":
      return {
        subject: "Passwordless sign-in reminder | RavenMUN 2026",
        heading: "RavenMUN uses passwordless sign-in",
        message: `Hello <strong>${name}</strong>,<br/><br/>There is no password to reset. Return to the sign-in page and request a new verification code for your email address.`,
        buttonText: "Open sign-in",
        buttonPath: "/login",
        accentColor: COLORS.primary,
      };
    case "payment_approved":
      return {
        subject: "Payment approved | RavenMUN 2026",
        heading: "Your payment was approved",
        message: `Hello <strong>${name}</strong>,<br/><br/>Your payment receipt has been reviewed and approved. Your participation payment step is complete.`,
        buttonText: "Open participant portal",
        buttonPath: "/portal",
        accentColor: COLORS.success,
      };
    case "payment_rejected":
      return {
        subject: "Payment needs attention | RavenMUN 2026",
        heading: "Please review your payment",
        message: `Hello <strong>${name}</strong>,<br/><br/>Your payment receipt could not be approved. Sign in to review the reason and upload a corrected receipt if needed.`,
        buttonText: "Review payment",
        buttonPath: "/payment",
        accentColor: COLORS.danger,
      };
    case "application_received":
      return {
        subject: "Application received | RavenMUN 2026",
        heading: "Your application has been received",
        message: `Hello <strong>${name}</strong>,<br/><br/>Thank you for applying to RavenMUN 2026. Your application is now in the review queue, and you can follow its progress from the participant portal.`,
        buttonText: "Open my applications",
        buttonPath: "/portal/applications",
      };
    case "application_status":
      return {
        subject: "Application update | RavenMUN 2026",
        heading: "Your application status changed",
        message: `Hello <strong>${name}</strong>,<br/><br/>There is an update to your RavenMUN application. Sign in to view the latest status and any next steps.`,
        buttonText: "View application",
        buttonPath: "/portal/applications",
        accentColor: COLORS.primary,
      };
    case "committee_assignment":
      return {
        subject: "Committee assignment | RavenMUN 2026",
        heading: "Your committee placement is ready",
        message: `Hello <strong>${name}</strong>,<br/><br/>Your RavenMUN committee assignment is available in the participant portal. Sign in to see your committee, role, and committee materials.`,
        buttonText: "Open committee",
        buttonPath: "/dashboard/committee",
        accentColor: COLORS.success,
      };
    case "connection_request":
      return {
        subject: "New connection request | RavenMUN",
        heading: "Someone wants to connect",
        message: `Hello <strong>${name}</strong>,<br/><br/>A participant sent you a connection request. Sign in to review it.`,
        buttonText: "Review requests",
        buttonPath: "/connections",
      };
    case "connection_accepted":
      return {
        subject: "Connection request accepted | RavenMUN",
        heading: "Your network is growing",
        message: `Hello <strong>${name}</strong>,<br/><br/>Your connection request was accepted. You can now view the connection from your participant portal.`,
        buttonText: "View connections",
        buttonPath: "/connections",
      };
    case "warning_issued":
      return {
        subject: "Conduct notice | RavenMUN",
        heading: "A conduct notice was added",
        message: `Hello <strong>${name}</strong>,<br/><br/>The conference team added a conduct notice to your account. Sign in to review the details.`,
        buttonText: "Open participant portal",
        buttonPath: "/portal",
        accentColor: COLORS.danger,
      };
    case "account_suspended":
      return {
        subject: "Account access update | RavenMUN",
        heading: "Your account access was restricted",
        message: `Hello <strong>${name}</strong>,<br/><br/>Your conference account access was restricted by the conference team. Contact the organizers if you believe this was a mistake.`,
        buttonText: "Open sign-in",
        buttonPath: "/login",
        accentColor: COLORS.danger,
      };
    case "password_changed":
      return {
        subject: "Security notice | RavenMUN",
        heading: "Passwordless account security notice",
        message: `Hello <strong>${name}</strong>,<br/><br/>A security setting for your account changed. RavenMUN accounts do not use passwords; review your active devices if you do not recognize this activity.`,
        buttonText: "Review devices",
        buttonPath: "/portal/sessions",
      };
    default:
      return {
        subject: "New notification | RavenMUN",
        heading: "You have a new notification",
        message: `Hello <strong>${name}</strong>,<br/><br/>There is a new notification in your RavenMUN participant portal.`,
        buttonText: "Open participant portal",
        buttonPath: "/portal",
      };
  }
};

export const generateEmailHtml = (
  type: NotificationType,
  userName: string,
  baseUrl: string,
  data?: EmailData,
) => {
  const content = getContent(type, userName, data);
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
  const targetUrl = content.buttonPath?.startsWith("http")
    ? content.buttonPath
    : `${cleanBaseUrl}${content.buttonPath || "/portal"}`;
  const headingColor = content.accentColor || COLORS.textPrimary;
  const buttonColor = content.accentColor || COLORS.primary;
  const sentAt = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${content.subject}</title></head>
      <body style="font-family:Arial,sans-serif;line-height:1.6;color:${COLORS.textPrimary};background:${COLORS.background};margin:0;padding:0;">
        <div style="width:100%;padding:40px 0;background:${COLORS.background};">
          <div style="max-width:600px;margin:0 auto;background:${COLORS.container};border:1px solid ${COLORS.border};border-radius:14px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#171321,#2b2140);padding:34px;text-align:center;">
              <div style="font-size:25px;font-weight:800;letter-spacing:3px;color:${COLORS.accent};">RAVENMUN</div>
              <div style="font-size:12px;color:${COLORS.textSecondary};margin-top:8px;letter-spacing:2px;text-transform:uppercase;">Conference participant services</div>
            </div>
            <div style="padding:40px;">
              <h2 style="margin:0 0 20px;font-size:22px;color:${headingColor};">${content.heading}</h2>
              <div style="margin-bottom:24px;font-size:15px;color:${COLORS.textSecondary};">${content.message}</div>
              ${content.buttonText ? `<div style="text-align:center;margin:32px 0 16px;"><a href="${targetUrl}" target="_blank" style="display:inline-block;background:${buttonColor};color:#100b18;text-decoration:none;padding:14px 28px;border-radius:9px;font-weight:700;font-size:14px;">${content.buttonText}</a></div>` : ""}
              <div style="margin-top:40px;border-top:1px solid ${COLORS.border};padding-top:20px;font-size:13px;color:${COLORS.textSecondary};">Questions? Contact the RavenMUN organizing team or use the support area in your portal.</div>
            </div>
            <div style="background:#120f1a;padding:26px 40px;text-align:center;border-top:1px solid ${COLORS.border};">
              <p style="margin:0;font-size:12px;color:${COLORS.textSecondary};">© 2026 RavenMUN. All rights reserved.</p>
              <p style="margin:10px 0 0;font-size:11px;color:${COLORS.textSecondary};opacity:.7;">Sent: ${sentAt}</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};
