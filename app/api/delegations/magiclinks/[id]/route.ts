import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { supabase } from "@/lib/SERVER_supabase";

export const GET = apiHandler(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { data: link } = await supabase.from("delegation_magiclinks").select("id, sent_to, delegation, is_used, delegation_info:delegations(name)").eq("id", id).maybeSingle();
  if (!link || link.is_used) return NextResponse.json({ error: "Invitation is invalid or expired." }, { status: 404 });
  const delegation = Array.isArray(link.delegation_info) ? link.delegation_info[0] : link.delegation_info;
  return NextResponse.json({ email: link.sent_to, delegationName: delegation?.name || "RavenMUN delegation", legacy: true });
});
