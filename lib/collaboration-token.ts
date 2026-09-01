import "server-only";

import jwt from "jsonwebtoken";

const AUDIENCE = "ravenmun-collaboration";
const LIFETIME_SECONDS = 5 * 60;

function collaborationSecret() {
  const secret = process.env.COLLAB_AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("COLLAB_AUTH_SECRET or NEXTAUTH_SECRET is required.");
  return secret;
}

export function createCollaborationToken(userId: string, sessionId: string) {
  return jwt.sign(
    { sessionId },
    collaborationSecret(),
    { subject: userId, audience: AUDIENCE, expiresIn: LIFETIME_SECONDS },
  );
}

export const COLLABORATION_TOKEN_LIFETIME_SECONDS = LIFETIME_SECONDS;
