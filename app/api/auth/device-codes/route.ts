import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import getAuthorization from "@/lib/getAuthorization";
import { createDevicePairingCode } from "@/lib/passwordless";

export const POST = apiHandler(async () => {
  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session?.user.sessionId) throw new Error("Unauthorized");
  const result = await createDevicePairingCode(auth.session.user.id, auth.session.user.sessionId);
  return NextResponse.json({ success: true, ...result });
});
