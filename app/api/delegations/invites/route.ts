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

const inviteRequestSchema = z.object({
  email: z.string().email().max(200).optional(),
  inviteId: z.string().uuid().optional(),
  turnstileToken: z.string().min(1).max(4096),
}).refine((value) => Boolean(value.email || value.inviteId), "An email or invitation ID is required.");

type InviteRecord = { id: string; email: string; delegation_id: string; expires_at: string; used_at: string | null; created_at: string };
type OutboxMessage = { id: string; recipient_email: string; subject: string; html: string; sent_at: string | null; created_at: string };

async function findEmailForInvite(invite: InviteRecord) {
  const { data, error } = await supabase
    .from("email_outbox")
    .select("id, recipient_email, subject, html, sent_at, created_at")
    .eq("recipient_email", invite.email)
    .eq("subject", "RavenMUN delegation invitation")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return ((data || []) as unknown as OutboxMessage[]).find((message) => new Date(message.created_at).getTime() >= new Date(invite.created_at).getTime()) || null;
}

async function deliverEmail(message: OutboxMessage) {
  if (message.sent_at) return true;
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
  const emailSent = await deliverEmail(message);
  return NextResponse.json({ success: true, emailSent, resent: true, invite });
}

export const GET = apiHandler(async () => {
  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const userId = auth.session.user.id;
  const { data: owned } = await supabase.from("delegations").select("id, name, owner_id").eq("owner_id", userId).maybeSingle();
  let delegation = owned;
  if (!delegation) {
    const { data: membership } = await supabase.from("delegation_members").select("delegation_id").eq("user_id", userId).maybeSingle();
    if (membership?.delegation_id) {
      const { data } = await supabase.from("delegations").select("id, name, owner_id").eq("id", membership.delegation_id).maybeSingle();
      delegation = data;
    }
  }
  if (!delegation) return NextResponse.json({ delegation: null, invites: [], members: [], canManage: false });
  const [{ data: rawInvites, error: inviteError }, { data: members, error: memberError }] = await Promise.all([
    supabase.from("delegation_invites").select("id, email, delegation_id, expires_at, used_at, created_at").eq("delegation_id", delegation.id).order("created_at", { ascending: false }),
    supabase.from("delegation_members").select("user_id, accepted, joined_at, user:users(id, email, full_name)").eq("delegation_id", delegation.id).order("joined_at", { ascending: true }),
  ]);
  if (inviteError || memberError) throw new Error("Unable to load delegation members.");
  const invites = (rawInvites || []) as unknown as InviteRecord[];
  const outboxResult = await supabase.from("email_outbox").select("recipient_email, subject, sent_at, created_at").eq("subject", "RavenMUN delegation invitation").order("created_at", { ascending: false }).limit(1000);
  if (outboxResult.error) throw outboxResult.error;
  const messages = (outboxResult.data || []) as unknown as Array<Pick<OutboxMessage, "recipient_email" | "subject" | "sent_at" | "created_at">>;
  const enrichedInvites = invites.map((invite) => ({
    ...invite,
    emailSent: messages.some((message) => message.recipient_email === invite.email && new Date(message.created_at).getTime() >= new Date(invite.created_at).getTime() && Boolean(message.sent_at)),
  }));
  return NextResponse.json({ delegation, invites: owned ? enrichedInvites : [], members: members || [], canManage: Boolean(owned) });
});

export const POST = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const input = inviteRequestSchema.parse(await request.json());
  if (!(await verifyTurnstileToken(input.turnstileToken, request))) {
    throw new Error("Please complete the security verification and try again.");
  }
  const { data: delegation } = await supabase.from("delegations").select("id, name").eq("owner_id", auth.session.user.id).maybeSingle();
  if (!delegation) throw new Error("Submit a Delegation application before inviting members.");

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
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const link = `${baseUrl}/delegations/invite?token=${encodeURIComponent(token)}`;
  const createdAfter = new Date().toISOString();
  const { data: invite, error } = await supabase.rpc("create_ravenmun_delegation_invite", {
    p_owner_id: auth.session.user.id,
    p_email: normalizedEmail,
    p_token_hash: hashOpaqueToken(token),
    p_expires_at: expiresAt,
    p_link: link,
    p_inviter_name: auth.session.user.name || "Your delegation owner",
  });
  if (error || !invite) {
    if (error?.message?.includes("active invitation")) {
      const { data: existing } = await supabase.from("delegation_invites").select("id, email, delegation_id, expires_at, used_at, created_at").eq("delegation_id", delegation.id).eq("email", normalizedEmail).is("used_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (existing) return resendExistingInvite(existing as unknown as InviteRecord);
    }
    throw error || new Error("Unable to create invitation.");
  }

  const { data: message } = await supabase.from("email_outbox").select("id, recipient_email, subject, html, sent_at, created_at").eq("recipient_email", normalizedEmail).eq("subject", "RavenMUN delegation invitation").gte("created_at", createdAfter).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const emailSent = message ? await deliverEmail(message as unknown as OutboxMessage) : false;
  return NextResponse.json({ success: true, emailSent, invite });
});
