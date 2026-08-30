import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import getAuthorization from "@/lib/getAuthorization";
import { supabase } from "@/lib/SERVER_supabase";

export const GET = apiHandler(async () => {
  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("active_sessions")
    .select("id, user_agent, ip_address, created_at, last_active, expires_at, revoked_at")
    .eq("user_id", auth.session.user.id)
    .is("revoked_at", null)
    .gt("expires_at", now)
    .order("last_active", { ascending: false });
  if (error) throw new Error("Unable to load sessions.");
  return NextResponse.json({ sessions: data || [] });
});

export const DELETE = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const body = await request.json().catch(() => ({}));
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : null;
  let query = supabase.from("active_sessions").update({ revoked_at: new Date().toISOString() }).eq("user_id", auth.session.user.id).is("revoked_at", null);
  if (!sessionId && auth.session.user.sessionId) query = query.neq("id", auth.session.user.sessionId);
  const { error } = sessionId ? await query.eq("id", sessionId) : await query;
  if (error) throw new Error("Unable to revoke sessions.");
  return NextResponse.json({ success: true });
});
