import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { Logger } from "@/lib/logger";
import { ROLES } from "@/lib/roles";
import { z } from "zod";

const defaults = {
  applications_open: true,
  maintenance_mode: false,
  gallery_enabled: false,
  term_name: "RavenMUN 2026",
  contact_email: "info@ravenmun.org",
  location: "RavenMUN Conference Venue",
  event_start_date: null,
  event_end_date: null,
  bank_name: "Conference payment account",
  bank_account_holder: "RavenMUN Organizing Committee",
  bank_iban: "TR00 0000 0000 0000 0000 0000 00",
};

const toDateString = (value: unknown) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};
const settingsSchema = z.object({
  applications_open: z.preprocess((value) => value === undefined ? true : value === true || value === "true", z.boolean()),
  maintenance_mode: z.preprocess((value) => value === true || value === "true", z.boolean()),
  gallery_enabled: z.preprocess((value) => value === true || value === "true", z.boolean()),
  term_name: z.string().trim().min(1).max(120),
  contact_email: z.string().email().max(200),
  location: z.string().trim().min(1).max(200),
  bank_name: z.string().trim().min(1).max(160),
  bank_account_holder: z.string().trim().min(1).max(160),
  bank_iban: z.string().trim().min(1).max(64),
  event_start_date: z.string().max(32).nullable().optional(),
  event_end_date: z.string().max(32).nullable().optional(),
});

function toIsoDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid event date.");
  return date.toISOString();
}

export async function GET() {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] });
  if (!auth.ok) return NextResponse.json({ error: auth.message || "Unauthorized" }, { status: auth.status || 401 });

  const { data: records, error } = await supabase.from("system_settings").select("*").limit(1);
  if (error || !records?.length) return NextResponse.json(defaults);

  const data = records[0];
  return NextResponse.json({
    ...data,
    term_name: data.term_name ?? defaults.term_name,
    contact_email: data.contact_email ?? defaults.contact_email,
    location: data.location ?? defaults.location,
    event_start_date: toDateString(data.event_start_date) || defaults.event_start_date,
    event_end_date: toDateString(data.event_end_date) || defaults.event_end_date,
    bank_name: data.bank_name ?? defaults.bank_name,
    bank_account_holder: data.bank_account_holder ?? defaults.bank_account_holder,
    bank_iban: data.bank_iban ?? defaults.bank_iban,
  });
}

export async function POST(request: Request) {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ROLES.SUPERADMIN });
  if (!auth.ok) return NextResponse.json({ error: auth.message || "Unauthorized" }, { status: auth.status || 401 });

  try {
    const body = settingsSchema.parse(await request.json());
    const { data: existingRecords } = await supabase.from("system_settings").select("*").limit(1);
    const existing = existingRecords?.[0] || {};
    const updateData = {
      applications_open: body.applications_open,
      maintenance_mode: body.maintenance_mode,
      gallery_enabled: body.gallery_enabled,
      term_name: body.term_name,
      contact_email: body.contact_email,
      location: body.location,
      bank_name: body.bank_name,
      bank_account_holder: body.bank_account_holder,
      bank_iban: body.bank_iban,
      event_start_date: toIsoDate(body.event_start_date),
      event_end_date: toIsoDate(body.event_end_date),
      updated_at: new Date().toISOString(),
    };

    const settingsQuery = existing.id
      ? supabase.from("system_settings").update(updateData).eq("id", existing.id)
      : supabase.from("system_settings").insert(updateData);
    const { error: settingsError } = await settingsQuery;
    if (settingsError) throw settingsError;

    const { error: ravenSettingsError } = await supabase.from("ravenmun_settings").upsert({
      id: true,
      conference_name: updateData.term_name,
      applications_open: updateData.applications_open,
      maintenance_mode: updateData.maintenance_mode,
      location: updateData.location,
      event_start_date: updateData.event_start_date,
      event_end_date: updateData.event_end_date,
      updated_at: updateData.updated_at,
    }, { onConflict: "id" });
    if (ravenSettingsError) throw ravenSettingsError;

    if (updateData.maintenance_mode && existing.maintenance_mode !== true) {
      const { data: users } = await supabase.from("users").select("id, role");
      const nonAdminIds = users
        ?.filter((user) => user.role !== ROLES.SUPERADMIN && user.role !== ROLES.ADMIN)
        .map((user) => user.id) || [];
      if (nonAdminIds.length) {
        await supabase.from("active_sessions").update({ revoked_at: new Date().toISOString() }).in("user_id", nonAdminIds);
      }
    }

    await Logger.audit(
      { userId: auth.session?.user?.id, req: request },
      {
        action: "update_settings",
        category: "system",
        resourceType: "settings",
        prevState: existing,
        nextState: { ...existing, ...updateData },
      },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
