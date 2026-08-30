import { NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import getAuthorization from "@/lib/getAuthorization";
import { supabase } from "@/lib/SERVER_supabase";
import { ROLES } from "@/lib/roles";
import { sanitizeHtml } from "@/lib/sanitize";

const updateSchema = z.object({
  type: z.enum(["page", "team"]),
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(160).optional(),
  excerpt: z.string().trim().max(500).nullable().optional(),
  body: z.string().max(50000).optional(),
  fullName: z.string().trim().min(1).max(120).optional(),
  role: z.string().trim().min(1).max(120).optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  isPublished: z.boolean().optional(),
});

export const GET = apiHandler(async () => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: [ROLES.ADMIN, ROLES.SUPERADMIN] });
  if (!auth.ok) throw new Error("Unauthorized");
  const [{ data: pages, error: pageError }, { data: team, error: teamError }] = await Promise.all([
    supabase.from("conference_pages").select("*").order("title"),
    supabase.from("conference_team_members").select("*").order("sort_order").order("full_name"),
  ]);
  if (pageError || teamError) throw new Error("Unable to load public content.");
  return NextResponse.json({ pages: pages || [], team: team || [] });
});

export const PUT = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: [ROLES.ADMIN, ROLES.SUPERADMIN] });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const input = updateSchema.parse(await request.json());
  const now = new Date().toISOString();
  const payload = input.type === "page"
    ? { ...(input.title !== undefined ? { title: input.title } : {}), ...(input.excerpt !== undefined ? { excerpt: input.excerpt } : {}), ...(input.body !== undefined ? { body: sanitizeHtml(input.body) } : {}), ...(input.isPublished !== undefined ? { is_published: input.isPublished } : {}), updated_by: auth.session.user.id, updated_at: now }
    : { ...(input.fullName !== undefined ? { full_name: input.fullName } : {}), ...(input.role !== undefined ? { role: input.role } : {}), ...(input.bio !== undefined ? { bio: input.bio } : {}), ...(input.isPublished !== undefined ? { is_published: input.isPublished } : {}), updated_at: now };
  const { error } = await supabase.from(input.type === "page" ? "conference_pages" : "conference_team_members").update(payload).eq("id", input.id);
  if (error) throw new Error("Unable to update public content.");
  await supabase.from("audit_logs").insert({ user_id: auth.session.user.id, action: "update_public_content", resource_type: input.type, resource_id: input.id });
  return NextResponse.json({ success: true });
});
