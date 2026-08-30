import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { supabase } from "@/lib/SERVER_supabase";
import { hashOpaqueToken } from "@/lib/passwordless";

export const GET = apiHandler(async (_request: Request, { params }: { params: Promise<{ token: string }> }) => {
  const { token } = await params;
  const { data: invite } = await supabase.from("delegation_invites").select("email, expires_at, used_at, delegation:delegations(name)").eq("token_hash", hashOpaqueToken(token)).maybeSingle();
  if (!invite || invite.used_at || new Date(invite.expires_at).getTime() <= Date.now()) return NextResponse.json({ error: "Invitation is invalid or expired." }, { status: 404 });
  const delegation = Array.isArray(invite.delegation) ? invite.delegation[0] : invite.delegation;
  return NextResponse.json({ email: invite.email, expiresAt: invite.expires_at, delegationName: delegation?.name || "RavenMUN delegation" });
});
