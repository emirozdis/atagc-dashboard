import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import getAuthorization from "@/lib/getAuthorization";
import { supabase } from "@/lib/SERVER_supabase";
import { hashOpaqueToken } from "@/lib/passwordless";
import { normalizeEmail } from "@/lib/crypto-utils";
import { sendEmail } from "@/lib/email";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { getSiteUrl } from "@/lib/site-url";
import { getStoredEmailTemplate } from "@/lib/email-template-service";
import { renderEmailTemplate } from "@/lib/email-templates";
import { HttpError } from "@/lib/http-error";

const inviteRequestSchema = z.object({
  email: z.string().email().max(200).optional(),
  inviteId: z.string().uuid().optional(),
  delegationId: z.string().uuid().optional(),
  turnstileToken: z.string().min(1).max(4096),
}).refine((value) => Boolean(value.email || value.inviteId), "An email or invitation ID is required.");

type DelegationSummary = { id: string; name: string; owner_id?: string | null; created_at?: string };

// a leader may own several delegations, so invitations and resends always target one explicit row
async function listOwnedDelegations(ownerId: string) {
  const { data, error } = await supabase
    .from("delegations")
    .select("id, name, owner_id, created_at")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) throw new HttpError(500, "Unable to load your delegations.");
  return (data || []) as unknown as DelegationSummary[];
}

// the RPC surfaces database failures by message only, so map them explicitly instead of letting them become 500s
function inviteFailure(error: { message?: string } | null) {
  const message = error?.message || "";
  const normalized = message.toLowerCase();
  if (normalized.includes("already exists") || normalized.includes("active invitation") || normalized.includes("duplicate")) {
    return new HttpError(409, "An active invitation already exists for this email address.");
  }
  if (normalized.includes("delegation not found")) {
    return new HttpError(404, "Delegation not found.");
  }
  return new HttpError(400, message || "Unable to create invitation.");
}

type InviteRecord = { id: string; email: string; delegation_id: string; expires_at: string; used_at: string | null; created_at: string };
type OutboxMessage = { id: string; recipient_email: string; subject: string; html: string; sent_at: string | null; created_at: string; related_invite_id?: string | null };

async function findEmailForInvite(invite: InviteRecord) {
  const { data, error } = await supabase
    .from("email_outbox")
    .select("id, recipient_email, subject, html, sent_at, created_at, related_invite_id")
    .eq("related_invite_id", invite.id)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return ((data || []) as unknown as OutboxMessage[]).find((message) => new Date(message.created_at).getTime() >= new Date(invite.created_at).getTime()) || null;
}

async function deliverEmail(message: OutboxMessage, force = false) {
  if (message.sent_at && !force) return true;
  try {
    await sendEmail(message.recipient_email, message.subject, message.html);
    const { error } = await supabase
      .from("email_outbox")
      .update({ sent_at: new Date().toISOString(), locked_at: null, locked_by: null, last_error: null })
      .eq("id", message.id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Delegation invitation email delivery failed:", error);
    return false;
  }
}

async function resendExistingInvite(invite: InviteRecord) {
  if (invite.used_at) throw new Error("This invitation has already been accepted.");
  if (!invite.expires_at || new Date(invite.expires_at).getTime() <= Date.now()) throw new Error("This invitation has expired. Send a new invitation.");
  const message = await findEmailForInvite(invite);
  if (!message) throw new Error("The original invitation email is unavailable. Send a new invitation after this one expires.");
  const emailSent = await deliverEmail(message, true);
  return NextResponse.json({ success: true, emailSent, resent: true, invite });
}

export const GET = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const userId = auth.session.user.id;
  const delegations = await listOwnedDelegations(userId);
  // prefer an explicitly requested delegation, otherwise the most recent one the user owns
  const requestedId = new URL(request.url).searchParams.get("delegationId");
  let delegation = delegations.find((entry) => entry.id === requestedId) || delegations[0] || null;
  if (!delegation) {
    const { data: memberships } = await supabase
      .from("delegation_members")
      .select("delegation_id")
      .eq("user_id", userId)
      .order("joined_at", { ascending: false })
      .limit(1);
    const membership = (memberships || [])[0] as { delegation_id?: string } | undefined;
    if (membership?.delegation_id) {
      const { data } = await supabase.from("delegations").select("id, name, owner_id, created_at").eq("id", membership.delegation_id).limit(1).maybeSingle();
      const fallback = (data as unknown as DelegationSummary | undefined) || null;
      if (fallback) delegation = fallback;
    }
  }
  if (!delegation) return NextResponse.json({ delegations: [], delegation: null, invites: [], members: [], canManage: false });
  const [{ data: rawInvites, error: inviteError }, { data: members, error: memberError }] = await Promise.all([
    supabase.from("delegation_invites").select("id, email, delegation_id, expires_at, used_at, created_at").eq("delegation_id", delegation.id).order("created_at", { ascending: false }),
    supabase.from("delegation_members").select("user_id, accepted, joined_at, user:users(id, email, full_name)").or(`delegation_id.eq.${delegation.id},delegation.eq.${delegation.id}`).order("joined_at", { ascending: true }),
  ]);
  if (inviteError || memberError) throw new HttpError(500, "Unable to load delegation members.");
  const invites = (rawInvites || []) as unknown as InviteRecord[];
  const outboxResult = await supabase.from("email_outbox").select("recipient_email, subject, sent_at, created_at, related_invite_id").order("created_at", { ascending: false }).limit(1000);
  if (outboxResult.error) throw outboxResult.error;
  const messages = (outboxResult.data || []) as unknown as Array<Pick<OutboxMessage, "recipient_email" | "subject" | "sent_at" | "created_at" | "related_invite_id">>;
  const enrichedInvites = invites.map((invite) => ({
    ...invite,
    emailSent: messages.some((message) => (
      message.related_invite_id === invite.id ||
      (!message.related_invite_id && message.recipient_email === invite.email && message.subject === "RavenMUN delegation invitation" && new Date(message.created_at).getTime() >= new Date(invite.created_at).getTime())
    ) && Boolean(message.sent_at)),
  }));
  const ownsDelegations = delegations.length > 0;
  return NextResponse.json({ delegations, delegation, invites: ownsDelegations ? enrichedInvites : [], members: members || [], canManage: ownsDelegations });
});

export const POST = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const input = inviteRequestSchema.parse(await request.json());
  if (!(await verifyTurnstileToken(input.turnstileToken, request))) {
    throw new Error("Please complete the security verification and try again.");
  }
  const ownedDelegations = await listOwnedDelegations(auth.session.user.id);
  if (ownedDelegations.length === 0) throw new HttpError(400, "Submit a Delegation application before inviting members.");
  // invitations target one explicit delegation so a leader running several of
  // them never has to guess which one receives the new member
  const delegation = input.delegationId
    ? ownedDelegations.find((entry) => entry.id === input.delegationId)
    : ownedDelegations[0];
  if (!delegation) throw new HttpError(404, "Delegation not found.");

  if (input.inviteId) {
    const { data: existing, error } = await supabase.from("delegation_invites").select("id, email, delegation_id, expires_at, used_at, created_at").eq("id", input.inviteId).eq("delegation_id", delegation.id).maybeSingle();
    if (error || !existing) throw new Error("Invitation not found.");
    return resendExistingInvite(existing as unknown as InviteRecord);
  }

  const normalizedEmail = normalizeEmail(input.email || "");
  const { data: activeInvite } = await supabase
    .from("delegation_invites")
    .select("id, email, delegation_id, expires_at, used_at, created_at")
    .eq("delegation_id", delegation.id)
    .eq("email", normalizedEmail)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (activeInvite) return resendExistingInvite(activeInvite as unknown as InviteRecord);

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const baseUrl = getSiteUrl();
  const link = `${baseUrl}/delegations/invite?token=${encodeURIComponent(token)}`;
  const createdAfter = new Date().toISOString();
  const invitationTemplate = await getStoredEmailTemplate("magic_link_invite");
  const renderedInvitation = renderEmailTemplate(
    "magic_link_invite",
    auth.session.user.name || "Your delegation owner",
    baseUrl,
    { link },
    invitationTemplate?.is_enabled === false ? null : invitationTemplate,
  );
  const { data: invite, error } = await supabase.rpc("create_ravenmun_delegation_invite", {
    p_owner_id: auth.session.user.id,
    p_email: normalizedEmail,
    p_token_hash: hashOpaqueToken(token),
    p_expires_at: expiresAt,
    p_link: link,
    p_inviter_name: auth.session.user.name || "Your delegation owner",
    p_subject: renderedInvitation.subject,
    p_html: renderedInvitation.html,
    p_delegation_id: delegation.id,
  });
  if (error || !invite) {
    if (error?.message?.includes("active invitation")) {
      const { data: existing } = await supabase.from("delegation_invites").select("id, email, delegation_id, expires_at, used_at, created_at").eq("delegation_id", delegation.id).eq("email", normalizedEmail).is("used_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (existing) return resendExistingInvite(existing as unknown as InviteRecord);
    }
    throw inviteFailure(error);
  }

  const inviteId = typeof invite.id === "string" ? invite.id : null;
  const { data: message } = await supabase.from("email_outbox").select("id, recipient_email, subject, html, sent_at, created_at, related_invite_id").eq("recipient_email", normalizedEmail).eq("related_invite_id", inviteId).gte("created_at", createdAfter).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const emailSent = message ? await deliverEmail(message as unknown as OutboxMessage) : false;
  return NextResponse.json({ success: true, emailSent, invite });
});
