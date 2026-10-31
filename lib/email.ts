import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

if (
  process.env.NODE_ENV !== "production" &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS &&
  !process.env.RESEND_API_KEY
) {
  transporter.verify((error) => {
    if (error) {
      console.warn("SMTP connection error:", error.message);
    } else {
      console.log("SMTP server is ready");
    }
  });
}

interface ResendSender {
  apiKey: string;
  from: string;
  label: "primary" | "fallback";
}

function resendSenders(): ResendSender[] {
  const primaryKey = process.env.RESEND_API_KEY;
  const primaryFrom = process.env.EMAIL_FROM || process.env.SMTP_FROM || '\"RavenMUN\" <no-reply@ravenmun.com>';
  const fallbackKey = process.env.RESEND_FALLBACK_API_KEY;
  const fallbackFrom = process.env.EMAIL_FALLBACK_FROM || primaryFrom;

  const senders: ResendSender[] = [];
  if (primaryKey) senders.push({ apiKey: primaryKey, from: primaryFrom, label: "primary" });
  if (fallbackKey && fallbackKey !== primaryKey) {
    senders.push({ apiKey: fallbackKey, from: fallbackFrom, label: "fallback" });
  }
  return senders;
}

async function sendWithResend(sender: ResendSender, to: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sender.apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({ from: sender.from, to: [to], subject, html }),
  });

  if (!response.ok) {
    const body = await response.text();
    let detail = body;
    try {
      const parsed = JSON.parse(body) as { message?: string };
      detail = parsed.message || body;
    } catch {
      // Keep the raw response in the server log when Resend does not return JSON.
    }
    console.error(`Resend ${sender.label} email delivery failed:`, { status: response.status, detail });
    throw new Error(`Resend ${sender.label} email delivery failed (${response.status}): ${detail}`);
  }
  return response.json();
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (process.env.NODE_ENV === "production" && process.env.EMAIL_DEV_MODE === "true") {
    throw new Error("EMAIL_DEV_MODE cannot be enabled in production.");
  }
  const safeSubject = /atag/i.test(subject) ? "RavenMUN notification" : subject;
  const senders = resendSenders();

  if (senders.length) {
    let lastError: unknown = null;
    for (const sender of senders) {
      try {
        return await sendWithResend(sender, to, safeSubject, html);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Resend email delivery failed");
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("Email delivery is not configured.");
  }

  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || '\"RavenMUN\" <no-reply@ravenmun.com>';
  try {
    return await transporter.sendMail({ from, to, subject: safeSubject, html });
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new Error("Email sending failed");
  }
}

const RAVENMUN_EMAIL_DOMAIN = "ravenmun.com";

export function isRavenmunEmailAddress(value: string) {
  const normalized = value.trim().toLowerCase();
  const [localPart, domain] = normalized.split("@");
  return Boolean(localPart)
    && domain === RAVENMUN_EMAIL_DOMAIN
    && normalized.includes("@")
    && normalized.endsWith(`@${RAVENMUN_EMAIL_DOMAIN}`)
    && normalized.split("@").length === 2;
}

export async function sendPlainTextEmail(to: string, from: string, subject: string, text: string) {
  if (process.env.NODE_ENV === "production" && process.env.EMAIL_DEV_MODE === "true") {
    throw new Error("EMAIL_DEV_MODE cannot be enabled in production.");
  }
  if (!isRavenmunEmailAddress(from)) throw new Error("The sender must use a ravenmun.com address.");
  if (/[\r\n]/.test(subject)) throw new Error("Subject cannot contain line breaks.");

  const senders = resendSenders();
  if (senders.length) {
    let lastError: unknown = null;
    for (const sender of senders) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sender.apiKey}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(10_000),
          body: JSON.stringify({ from: from.trim(), to: [to.trim()], subject: subject.trim(), text }),
        });
        if (!response.ok) {
          const body = await response.text();
          let detail = body;
          try {
            const parsed = JSON.parse(body) as { message?: string };
            detail = parsed.message || body;
          } catch {
            // Keep the raw response in the server log when Resend does not return JSON.
          }
          console.error(`Resend ${sender.label} plain-text delivery failed:`, { status: response.status, detail });
          throw new Error(`Resend ${sender.label} plain-text delivery failed (${response.status}): ${detail}`);
        }
        return response.json();
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Resend plain-text delivery failed");
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("Email delivery is not configured.");
  }

  try {
    return await transporter.sendMail({ from: from.trim(), to: to.trim(), subject: subject.trim(), text });
  } catch (error) {
    console.error("Plain-text email sending failed:", error);
    throw new Error("Email sending failed");
  }
}
