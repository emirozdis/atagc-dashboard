import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import getAuthorization from "@/lib/getAuthorization";
import { createParticipantQrPayload } from "@/lib/security-token";

export const GET = apiHandler(async () => {
  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  return NextResponse.json({ payload: createParticipantQrPayload(auth.session.user.id), expiresInSeconds: 300 });
});
