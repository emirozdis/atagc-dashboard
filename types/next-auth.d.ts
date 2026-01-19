import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "superadmin" | "admin" | "committee_chairman" | "deputy_chair" | "applicant";
      sessionId: string;
      applicationStatus?: "pending" | "approved" | "rejected";
      applicantType?: "delegate" | "press" | "observer"; // Added: To distinguish applicant sub-types
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    sessionId?: string;
    applicationStatus?: "pending" | "approved" | "rejected";
    applicantType?: "delegate" | "press" | "observer"; // Added
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    sessionId: string;
    applicationStatus?: "pending" | "approved" | "rejected";
    applicantType?: "delegate" | "press" | "observer"; // Added
  }
}

// Change Log:
// - Added `applicantType` to Session, User, and JWT types to track if a user is a delegate, press, or observer.