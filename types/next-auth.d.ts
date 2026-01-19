import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      // Added delegate, press, observer to the role union type
      role: "superadmin" | "admin" | "committee_chairman" | "deputy_chair" | "applicant" | "delegate" | "press" | "observer";
      sessionId: string;
      applicationStatus?: "pending" | "approved" | "rejected";
      applicantType?: "delegate" | "press" | "observer";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    sessionId?: string;
    applicationStatus?: "pending" | "approved" | "rejected";
    applicantType?: "delegate" | "press" | "observer";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    sessionId: string;
    applicationStatus?: "pending" | "approved" | "rejected";
    applicantType?: "delegate" | "press" | "observer";
  }
}

// Change Log:
// - Expanded `role` type to include 'delegate', 'press', 'observer' to match the database updates.