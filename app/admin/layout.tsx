import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import RavenAdminShell from "@/components/raven/RavenAdminShell";
import { authOptions } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/roles";

export const metadata: Metadata = { robots: { index: false, follow: false, noarchive: true } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=/admin");
  if (!ADMIN_ROLES.includes(session.user.role)) redirect("/portal");
  return <RavenAdminShell>{children}</RavenAdminShell>;
}
