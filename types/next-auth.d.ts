import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "superadmin" | "admin" | "committee_chairman" | "deputy_chair" | "applicant";
      sessionId: string;
      applicationStatus?: "pending" | "approved" | "rejected"; // Added status
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    sessionId?: string;
    applicationStatus?: "pending" | "approved" | "rejected"; // Added status
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    sessionId: string;
    applicationStatus?: "pending" | "approved" | "rejected"; // Added status
  }
}

// Change Log:
// - Added `applicationStatus` to Session, User, and JWT interfaces to track approval state.