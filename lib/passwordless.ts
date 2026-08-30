import "server-only";

import { sendEmail } from "@/lib/email";
import { supabase } from "@/lib/SERVER_supabase";
import { ApplicationStatusEnum } from "@/types/application";
import { ROLES, UserRole } from "@/lib/roles";
import {
  createOpaqueToken,
  createOtp,
  hashEmailVerificationCode as hashEmailCode,
  hashOpaqueToken as hashToken,
  hashPasswordlessCode,
  normalizeEmail,
  timingSafeEqualStrings,
} from "@/lib/crypto-utils";

export type PasswordlessPurpose = "application" | "login";

const CHALLENGE_LIFETIME_MS = 10 * 60 * 1000;
const EXCHANGE_LIFETIME_MS = 60 * 1000;
const SESSION_LIFETIME_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_CHALLENGE_ATTEMPTS = 10;

function authSecret() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for passwordless authentication.");
  return secret;
}

function hashValue(value: string) {
  return hashToken(authSecret(), value);
}

function codeHash(email: string, purpose: PasswordlessPurpose, code: string) {
  return hashPasswordlessCode(authSecret(), email, purpose, code);
}

export function hashEmailVerificationCode(email: string, code: string) {
  return hashEmailCode(authSecret(), email, code);
}

export function hashOpaqueToken(token: string) {
  return hashToken(authSecret(), token);
}

export function verifyEmailVerificationCode(email: string, code: string, expectedHash: string) {
  return timingSafeEqualStrings(expectedHash, hashEmailVerificationCode(email, code));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
}

function verificationEmail(code: string, purpose: PasswordlessPurpose) {
  const title = purpose === "application" ? "RavenMUN application code" : "RavenMUN sign-in code";
  return `<!doctype html>
<html lang="en"><body style="margin:0;background:#08070d;color:#f5f3ff;font-family:Arial,sans-serif;padding:32px">
  <div style="max-width:560px;margin:auto;background:#12101a;border:1px solid #2c263b;border-radius:18px;padding:32px">
    <p style="color:#c4b5fd;letter-spacing:.18em;text-transform:uppercase;font-size:12px">RavenMUN</p>
    <h1 style="font-size:26px;margin:0 0 14px">${title}</h1>
    <p style="color:#c3c7d1;line-height:1.6">Use this one-time code to continue. It expires in 10 minutes.</p>
    <div style="margin:28px 0;padding:18px;text-align:center;background:#08070d;border:1px solid #7c3aed;border-radius:12px;font-size:34px;letter-spacing:.28em;font-weight:700">${escapeHtml(code)}</div>
    <p style="color:#9ca3af;font-size:13px;line-height:1.6">If you did not request this code, you can safely ignore this email.</p>
  </div>
</body></html>`;
}

export async function createEmailChallenge(input: {
  email: string;
  purpose: PasswordlessPurpose;
  displayName?: string;
}) {
  const email = normalizeEmail(input.email);
  const code = createOtp();
  const expiresAt = new Date(Date.now() + CHALLENGE_LIFETIME_MS).toISOString();

  const { data, error } = await supabase
    .from("auth_challenges")
    .insert({
      email,
      purpose: input.purpose,
      code_hash: codeHash(email, input.purpose, code),
      metadata: { displayName: input.displayName?.trim().slice(0, 100) || null },
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error("Unable to create verification challenge.");

  try {
    await sendEmail(email, `${input.purpose === "application" ? "RavenMUN application" : "RavenMUN sign-in"} code`, verificationEmail(code, input.purpose));
  } catch (error) {
    if (process.env.NODE_ENV === "production" || process.env.EMAIL_DEV_MODE !== "true") throw error;
    console.warn("Email delivery failed in development; returning the development code instead.", error instanceof Error ? error.message : error);
  }

  return {
    challengeId: data.id as string,
    // Useful for local development when SMTP is intentionally not configured.
    developmentCode: process.env.NODE_ENV === "development" ? code : undefined,
  };
}

async function getOrCreateUser(email: string, displayName?: string) {
  const { data: existing, error: lookupError } = await supabase
    .from("users")
    .select("id, email, full_name, role, account_role, is_suspended")
    .eq("email", email)
    .maybeSingle();

  if (lookupError) throw new Error("Unable to load account.");
  if (existing) {
    if (existing.is_suspended) throw new Error("This account is suspended.");
    if (!existing.full_name && displayName?.trim()) {
      await supabase.from("users").update({ full_name: displayName.trim().slice(0, 100), updated_at: new Date().toISOString() }).eq("id", existing.id);
    }
    return existing;
  }

  const { data: created, error } = await supabase
    .from("users")
    .insert({
      email,
      full_name: displayName?.trim().slice(0, 100) || email.split("@")[0],
      role: ROLES.APPLICANT,
      account_role: "member",
    })
    .select("id, email, full_name, role, account_role, is_suspended")
    .single();

  if (error || !created) throw new Error("Unable to create account.");
  return created;
}

type PasswordlessUser = {
  id: string;
  email: string;
  full_name: string;
  role?: string | null;
  account_role?: string | null;
  is_suspended?: boolean | null;
};

function isApplicationStatus(value: string | null | undefined): value is ApplicationStatusEnum {
  return value === ApplicationStatusEnum.PENDING || value === ApplicationStatusEnum.UNDER_REVIEW || value === ApplicationStatusEnum.ACCEPTED || value === ApplicationStatusEnum.APPROVED || value === ApplicationStatusEnum.REJECTED || value === ApplicationStatusEnum.WITHDRAWN;
}

async function userSessionPayload(user: PasswordlessUser) {
  const [{ data: assignment, error: assignmentError }, { data: applications, error: applicationsError }, { data: details, error: detailsError }] = await Promise.all([
    supabase.from("conference_assignments").select("role, committee_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("applications").select("application_type, status, submitted_at").eq("user_id", user.id).order("submitted_at", { ascending: false }),
    supabase.from("user_details").select("profile_picture_url").eq("user_id", user.id).maybeSingle(),
  ]);
  if (assignmentError || applicationsError || detailsError) {
    throw new Error("Unable to load account permissions.");
  }

  const role = (assignment?.role || user.role || ROLES.APPLICANT) as UserRole;
  const latestApplication = applications?.[0];
  let applicationStatus: ApplicationStatusEnum | undefined;
  if (isApplicationStatus(latestApplication?.status)) applicationStatus = latestApplication.status;
  if (assignment?.role) applicationStatus = ApplicationStatusEnum.APPROVED;

  const accountRole = user.account_role === "super_admin" ? ROLES.SUPERADMIN : user.account_role === "site_admin" ? ROLES.ADMIN : role;
  return {
    id: user.id as string,
    name: user.full_name || user.email,
    email: user.email as string,
    role: accountRole as UserRole,
    image: details?.profile_picture_url || null,
    applicationStatus,
    applicantType: role,
    committeeId: assignment?.committee_id || null,
  };
}

async function issueLoginExchange(userId: string) {
  const token = createOpaqueToken();
  const { error } = await supabase.from("auth_login_exchanges").insert({
    token_hash: hashValue(token),
    user_id: userId,
    expires_at: new Date(Date.now() + EXCHANGE_LIFETIME_MS).toISOString(),
  });
  if (error) throw new Error("Unable to prepare sign-in.");
  return token;
}

export async function verifyEmailChallenge(input: {
  challengeId: string;
  email: string;
  purpose: PasswordlessPurpose;
  code: string;
  displayName?: string;
}) {
  const email = normalizeEmail(input.email);
  const { data: challenge, error } = await supabase
    .from("auth_challenges")
    .select("id, email, purpose, code_hash, attempts, expires_at, consumed_at, metadata")
    .eq("id", input.challengeId)
    .eq("email", email)
    .eq("purpose", input.purpose)
    .maybeSingle();

  if (error || !challenge || challenge.consumed_at || new Date(challenge.expires_at).getTime() <= Date.now() || challenge.attempts >= MAX_CHALLENGE_ATTEMPTS) {
    throw new Error("Invalid or expired verification code.");
  }

  const matches = timingSafeEqualStrings(challenge.code_hash, codeHash(email, input.purpose, input.code.trim()));
  if (!matches) {
    await supabase.rpc("increment_ravenmun_auth_attempt", { p_challenge_id: challenge.id });
    throw new Error("Invalid or expired verification code.");
  }

  const { data: consumed } = await supabase
    .from("auth_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", challenge.id)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();
  if (!consumed) throw new Error("Invalid or expired verification code.");

  const metadataName = (challenge.metadata as { displayName?: string } | null)?.displayName;
  const user = await getOrCreateUser(email, input.displayName || metadataName);
  return { exchangeToken: await issueLoginExchange(user.id), user: await userSessionPayload(user) };
}

export async function consumeLoginExchange(input: {
  exchangeToken: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { data: exchange } = await supabase
    .from("auth_login_exchanges")
    .select("id, user_id, expires_at, consumed_at")
    .eq("token_hash", hashValue(input.exchangeToken))
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!exchange) throw new Error("Invalid or expired sign-in exchange.");

  const { data: consumed } = await supabase
    .from("auth_login_exchanges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", exchange.id)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();
  if (!consumed) throw new Error("Invalid or expired sign-in exchange.");

  const { data: user, error } = await supabase.from("users").select("id, email, full_name, role, account_role, is_suspended").eq("id", exchange.user_id).single();
  if (error || !user || user.is_suspended) throw new Error("This account is unavailable.");

  // A browser should have one active session. Re-authentication after a logout
  // must not leave a stale copy of the same device in the session list.
  const sessionNow = new Date().toISOString();
  let previousDeviceSessions = supabase
    .from("active_sessions")
    .update({ revoked_at: sessionNow })
    .eq("user_id", user.id)
    .is("revoked_at", null);
  previousDeviceSessions = input.ipAddress
    ? previousDeviceSessions.eq("ip_address", input.ipAddress)
    : previousDeviceSessions.is("ip_address", null);
  previousDeviceSessions = input.userAgent
    ? previousDeviceSessions.eq("user_agent", input.userAgent)
    : previousDeviceSessions.is("user_agent", null);
  await previousDeviceSessions;

  const { data: session, error: sessionError } = await supabase
    .from("active_sessions")
    .insert({
      user_id: user.id,
      ip_address: input.ipAddress || null,
      user_agent: input.userAgent || null,
      expires_at: new Date(Date.now() + SESSION_LIFETIME_MS).toISOString(),
    })
    .select("id")
    .single();
  if (sessionError || !session) throw new Error("Unable to start session.");

  return { ...(await userSessionPayload(user)), sessionId: session.id as string };
}

export async function createDevicePairingCode(userId: string, sessionId: string) {
  const { data: validSession } = await supabase.from("active_sessions").select("id").eq("id", sessionId).eq("user_id", userId).is("revoked_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!validSession) throw new Error("Session revoked or expired.");

  const code = createOpaqueToken().slice(0, 10).toUpperCase();
  const { error } = await supabase.from("device_pairing_codes").insert({
    user_id: userId,
    creator_session_id: sessionId,
    code_hash: hashValue(code),
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  if (error) throw new Error("Unable to create device code.");
  return { code, expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() };
}

export async function consumeDevicePairingCode(input: { code: string; ipAddress?: string; userAgent?: string }) {
  const { data: pairing } = await supabase
    .from("device_pairing_codes")
    .select("id, user_id, creator_session_id, expires_at, consumed_at")
    .eq("code_hash", hashValue(input.code.trim().toUpperCase()))
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!pairing) throw new Error("Invalid or expired device code.");

  const { data: creatorSession } = await supabase.from("active_sessions").select("id").eq("id", pairing.creator_session_id).is("revoked_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!creatorSession) throw new Error("The device code is no longer active.");

  const { data: consumed } = await supabase.from("device_pairing_codes").update({ consumed_at: new Date().toISOString() }).eq("id", pairing.id).is("consumed_at", null).select("id").maybeSingle();
  if (!consumed) throw new Error("Invalid or expired device code.");
  return issueLoginExchange(pairing.user_id);
}
