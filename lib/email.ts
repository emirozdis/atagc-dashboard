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
  !process.env.RESEND_API_KEY &&
  process.env.EMAIL_DEV_MODE !== "true"
) {
  transporter.verify((error) => {
    if (error) {
      console.warn("SMTP connection error:", error.message);
    } else {
      console.log("SMTP server is ready");
    }
  });
}

export async function sendEmail(to: string, subject: string, html: string) {
  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || '\"RavenMUN\" <no-reply@ravenmun.org>';
  const safeSubject = /atag/i.test(subject) ? "RavenMUN notification" : subject;

  if (process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({ from, to: [to], subject: safeSubject, html }),
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
      console.error("Resend email delivery failed:", { status: response.status, detail });
      throw new Error(`Resend email delivery failed (${response.status}): ${detail}`);
    }
    return response.json();
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email delivery is not configured.");
    }
    console.warn("SMTP credentials missing. Email not sent:", { to, subject });
    return;
  }

  try {
    return await transporter.sendMail({ from, to, subject: safeSubject, html });
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new Error("Email sending failed");
  }
}
