import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";
import { UserRole } from "@/lib/roles";
import { ApplicationStatus } from "@/types/application";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      sessionId: string;
      applicationStatus?: ApplicationStatus;
      applicantType?: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: UserRole;
    sessionId?: string;
    applicationStatus?: ApplicationStatus;
    applicantType?: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    sessionId: string;
    applicationStatus?: ApplicationStatus;
    applicantType?: UserRole;
  }
}

// Change Log:
// - Imported `UserRole` from `lib/roles`.
// - Replaced hardcoded string union types with strict `UserRole`.
// - Imported `ApplicationStatus` for consistency.