import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "superadmin" | "admin" | "committee_chairman" | "deputy_chair" | "applicant";
      sessionId: string; // Added
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    sessionId?: string; // Added
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    sessionId: string; // Added
  }
}

// Change Log:
// - Added `sessionId` to User, Session, and JWT interfaces.