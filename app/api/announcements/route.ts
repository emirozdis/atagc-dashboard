import { NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import getAuthorization from "@/lib/getAuthorization";
import { supabase } from "@/lib/SERVER_supabase";
import { sanitizeHtml } from "@/lib/sanitize";
import { ROLES } from "@/lib/roles";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";

const readLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });
const writeLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 100 });
const announcementSchema = z.object({
  title: z.string().trim().min(2).max(180),
  content: z.string().trim().min(2).max(20000),
  targetType: z.enum(["all", "role", "committee", "user"]),
  targetRoles: z.array(z.string()).max(20).default([]),
  committeeIds: z.array(z.uuid()).max(200).default([]),
  userIds: z.array(z.uuid()).max(2000).default([]),
  turnstileToken: z.string().min(1).max(4096),
});

type AnnouncementRecord = {
  id: string;
  title: string;
  content: string;
  target_type: "all" | "role" | "committee" | "user";
  target_roles: string[];
  target_committee_ids: string[];
  target_user_ids: string[];
  created_at: string;
  author?: { full_name?: string } | null;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[character] || character);
}

async function resolveRecipients(input: z.infer<typeof announcementSchema>) {
  if (input.targetType === "user") {
    const { data, error } = await supabase.from("users").select("id,email,full_name").in("id", input.userIds);
    if (error) throw error;
    return data || [];
  }

  if (input.targetType === "role") {
    if (!input.targetRoles.length) throw new Error("Choose at least one target role.");
    const [{ data: assignments, error: assignmentError }, { data: siteUsers, error: siteError }] = await Promise.all([
      supabase.from("conference_assignments").select("user_id").in("role", input.targetRoles),
      supabase.from("users").select("id").in("role", input.targetRoles),
    ]);
    if (assignmentError || siteError) throw new Error("Unable to resolve announcement recipients.");
    const ids = [...new Set([...(assignments || []).map((assignment) => assignment.user_id), ...(siteUsers || []).map((user) => user.id)])];
    if (!ids.length) return [];
    const { data, error: usersError } = await supabase.from("users").select("id,email,full_name").in("id", ids);
    if (usersError) throw usersError;
    return data || [];
  }

  if (input.targetType === "committee") {
    if (!input.committeeIds.length) throw new Error("Choose at least one committee.");
    const { data: assignments, error } = await supabase.from("conference_assignments").select("user_id").in("committee_id", input.committeeIds);
    if (error) throw error;
    const ids = [...new Set((assignments || []).map((assignment) => assignment.user_id))];
    if (!ids.length) return [];
    const { data, error: usersError } = await supabase.from("users").select("id,email,full_name").in("id", ids);
    if (usersError) throw usersError;
    return data || [];
  }

  const { data, error } = await supabase.from("users").select("id,email,full_name");
  if (error) throw error;
  return data || [];
}

export const GET = apiHandler(async (request: Request) => {
  await readLimiter.check(60, request.headers.get("x-forwarded-for") || "127.0.0.1");
  const auth = await getAuthorization({ requireAuth: false });
  const user = auth.session?.user;
  const { data: announcements, error } = await supabase.from("announcements").select("id,title,content,target_type,target_roles,target_committee_ids,target_user_ids,created_at,author:users(full_name)").order("created_at", { ascending: false }).limit(100);
  if (error) throw error;

  let committeeId: string | null = null;
  if (user) {
    const { data: assignment } = await supabase.from("conference_assignments").select("committee_id").eq("user_id", user.id).maybeSingle();
    committeeId = assignment?.committee_id || null;
  }
  const role = user?.role;
  const visible = (announcements || []) as unknown as AnnouncementRecord[];
  const filtered = visible.filter((announcement) => {
    if (announcement.target_type === "all") return true;
    if (!user) return false;
    if (announcement.target_type === "user") return (announcement.target_user_ids || []).includes(user.id);
    if (announcement.target_type === "role") return role ? (announcement.target_roles || []).includes(role) : false;
    return committeeId ? (announcement.target_committee_ids || []).includes(committeeId) : false;
  });
  return NextResponse.json(filtered);
});

export const POST = apiHandler(async (request: Request) => {
  await writeLimiter.check(10, request.headers.get("x-forwarded-for") || "127.0.0.1");
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const input = announcementSchema.parse(await request.json());
  if (!(await verifyTurnstileToken(input.turnstileToken, request))) {
    throw new Error("Please complete the security verification and try again.");
  }
  const recipients = await resolveRecipients(input);
  if (!recipients.length) throw new Error("The selected audience has no registered recipients.");

  const content = sanitizeHtml(input.content);
  const announcementHtml = `<!doctype html><html lang="en"><body style="font-family:Arial,sans-serif;background:#08070d;color:#f5f3ff;padding:32px"><div style="max-width:600px;margin:auto;background:#12101a;border:1px solid #332b49;border-radius:16px;padding:32px"><p style="color:#c4b5fd;letter-spacing:.2em;text-transform:uppercase;font-size:12px">RavenMUN announcement</p><h1>${escapeHtml(input.title)}</h1><div style="color:#c3c7d1;line-height:1.7">${content}</div></div></body></html>`;
  const emailRows = recipients.map((recipient) => ({
    id: recipient.id,
    email: recipient.email,
    recipient_name: recipient.full_name,
    full_name: recipient.full_name,
    html: announcementHtml,
  }));
  const { data: announcementId, error } = await supabase.rpc("publish_ravenmun_announcement", {
    p_title: input.title,
    p_content: content,
    p_author_id: auth.session.user.id,
    p_target_type: input.targetType,
    p_target_roles: input.targetRoles,
    p_committee_ids: input.committeeIds,
    p_user_ids: input.userIds,
    p_recipients: emailRows,
  });
  if (error || !announcementId) throw error || new Error("Unable to create announcement.");
  return NextResponse.json({ success: true, id: announcementId, recipientCount: recipients.length });
});

export const DELETE = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const id = new URL(request.url).searchParams.get("id");
  if (!id) throw new Error("Missing announcement ID.");
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw error;
  await supabase.from("audit_logs").insert({ user_id: auth.session.user.id, action: "delete_announcement", resource_type: "announcement", resource_id: id });
  return NextResponse.json({ success: true });
});
