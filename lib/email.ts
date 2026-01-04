import nodemailer from "nodemailer";

// Configured for Brevo (Sendinblue) SMTP by default
// Host: smtp-relay.brevo.com
// Port: 587 (STARTTLS)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true", // false for 587, true for 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify connection configuration on startup (optional but helpful for debugging)
if (process.env.NODE_ENV !== 'production') {
  transporter.verify(function (error, success) {
    if (error) {
      console.warn("⚠️ SMTP Connection Error:", error.message);
    } else {
      console.log("✅ SMTP Server is ready");
    }
  });
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP credentials missing. Email not sent:", { to, subject });
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"ATAGÇ Sistem" <no-reply@atagc.com.tr>',
      to,
      subject,
      html,
    });
    return info;
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new Error("Email sending failed");
  }
}

// Change Log:
// - Defaulted SMTP Host to `smtp-relay.brevo.com` for easier Brevo integration.
// - Added connection verification logic in development mode.
// - Added check for credentials existence before attempting to send.