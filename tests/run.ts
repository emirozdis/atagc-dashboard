import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  createOpaqueToken,
  createOtp,
  createParticipantQrPayload,
  hashEmailVerificationCode,
  hashOpaqueToken,
  normalizeEmail,
  verifyParticipantQrPayload,
} from "../lib/crypto-utils";
import {
  APPLICATION_TYPES,
  CONFERENCE_ASSIGNMENT_ROLES,
  getEffectiveRole,
  PUBLIC_APPLICATION_TYPES,
  ROLES,
  SITE_ADMIN_ROLES,
} from "../lib/roles";
import { verifyResendWebhook } from "../lib/resend-webhook";
import { renderEmailTemplate } from "../lib/email-templates";
import { isRavenmunEmailAddress } from "../lib/email";

const secret = "ravenmun-test-secret";

assert.equal(normalizeEmail("  Applicant@Example.COM "), "applicant@example.com");
assert.equal(hashEmailVerificationCode(secret, "Applicant@Example.COM", "123456"), hashEmailVerificationCode(secret, " applicant@example.com ", "123456"));
assert.notEqual(hashEmailVerificationCode(secret, "applicant@example.com", "123456"), hashEmailVerificationCode(secret, "applicant@example.com", "123457"));
assert.notEqual(hashOpaqueToken(secret, "token-a"), hashOpaqueToken(secret, "token-b"));

const otp = createOtp();
assert.match(otp, /^\d{6}$/);
const opaqueToken = createOpaqueToken();
assert.ok(opaqueToken.length >= 40);

const qr = createParticipantQrPayload(secret, "participant-1", 1_000);
assert.equal(verifyParticipantQrPayload(secret, qr, 1_001), "participant-1");
assert.equal(verifyParticipantQrPayload("wrong-secret", qr, 1_001), null);
assert.equal(verifyParticipantQrPayload(secret, qr, 301_001), null);
assert.equal(verifyParticipantQrPayload(secret, qr.replace(/.$/, "x"), 1_001), null);

assert.deepEqual(PUBLIC_APPLICATION_TYPES, [
  APPLICATION_TYPES.DELEGATE,
  APPLICATION_TYPES.CHAIRBOARD,
  APPLICATION_TYPES.DELEGATION,
  APPLICATION_TYPES.PRESS,
  APPLICATION_TYPES.OBSERVER,
]);
assert.equal(PUBLIC_APPLICATION_TYPES.length, 5);
assert.ok(SITE_ADMIN_ROLES.includes(ROLES.ADMIN));
assert.ok(!SITE_ADMIN_ROLES.includes(ROLES.DELEGATE));
assert.ok(CONFERENCE_ASSIGNMENT_ROLES.includes(ROLES.OBSERVER));
assert.equal(getEffectiveRole({ role: ROLES.APPLICANT, applicantType: ROLES.PRESS }), ROLES.APPLICANT);
assert.equal(getEffectiveRole({ role: ROLES.APPLICANT }), ROLES.APPLICANT);
assert.equal(isRavenmunEmailAddress("team@ravenmun.com"), true);
assert.equal(isRavenmunEmailAddress("TEAM@RAVENMUN.COM"), true);
assert.equal(isRavenmunEmailAddress("team@example.com"), false);
assert.equal(isRavenmunEmailAddress("team@ravenmun.com.evil.example"), false);

const previousWebhookSecret = process.env.RESEND_WEBHOOK_SECRET;
const webhookSecretBytes = Buffer.from("ravenmun-webhook-test-secret");
const webhookPayload = JSON.stringify({ type: "email.received", data: { email_id: "re_test" } });
const webhookId = "msg_test";
const webhookTimestamp = Math.floor(Date.now() / 1000).toString();
const webhookSignature = createHmac("sha256", webhookSecretBytes)
  .update(`${webhookId}.${webhookTimestamp}.${webhookPayload}`)
  .digest("base64");
process.env.RESEND_WEBHOOK_SECRET = `whsec_${webhookSecretBytes.toString("base64")}`;
const webhookHeaders = new Headers({
  "svix-id": webhookId,
  "svix-timestamp": webhookTimestamp,
  "svix-signature": `v1,${webhookSignature}`,
});
assert.equal(verifyResendWebhook(webhookPayload, webhookHeaders), true);
assert.equal(verifyResendWebhook(`${webhookPayload} `, webhookHeaders), false);
if (previousWebhookSecret === undefined) delete process.env.RESEND_WEBHOOK_SECRET;
else process.env.RESEND_WEBHOOK_SECRET = previousWebhookSecret;

const customizedStatusEmail = renderEmailTemplate(
  "application_status",
  "Raven Applicant",
  "https://ravenmun.example",
  {
    applicationId: "app-123",
    applicationType: "delegate",
    previousStatus: "pending",
    status: "accepted",
    reviewNotes: "Welcome to the conference.",
  },
  {
    notification_type: "application_status",
    subject: "Decision for {{name}}: {{status}}",
    heading: "{{application_type}} decision",
    body_html: "<p>{{review_notes}}</p><script>alert('blocked')</script>",
    button_text: "Open application",
    button_path: "/my-applications/{{application_type_slug}}?applicationId={{application_id}}",
    accent_color: "#9b7bda",
    is_enabled: true,
  },
);
assert.equal(customizedStatusEmail.subject, "Decision for Raven Applicant: Accepted");
assert.match(customizedStatusEmail.html, /Welcome to the conference\./);
assert.doesNotMatch(customizedStatusEmail.html, /<script/i);
assert.match(customizedStatusEmail.html, /\/my-applications\/delegate\?applicationId=app-123/);

console.log("RavenMUN security and role tests passed.");
