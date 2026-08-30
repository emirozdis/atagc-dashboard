import assert from "node:assert/strict";
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

console.log("RavenMUN security and role tests passed.");
