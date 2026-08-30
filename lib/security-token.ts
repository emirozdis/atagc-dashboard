import "server-only";
import { createParticipantQrPayload as createPayload, verifyParticipantQrPayload as verifyPayload } from "@/lib/crypto-utils";

function secret() {
  if (!process.env.NEXTAUTH_SECRET) throw new Error("NEXTAUTH_SECRET is required.");
  return process.env.NEXTAUTH_SECRET;
}

export function createParticipantQrPayload(userId: string) {
  return createPayload(secret(), userId);
}

export function verifyParticipantQrPayload(value: string) {
  return verifyPayload(secret(), value);
}
