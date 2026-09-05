import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import RavenPortalShell from "@/components/raven/RavenPortalShell";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = { robots: { index: false, follow: false, noarchive: true } };

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=/portal");
  return <RavenPortalShell>{children}</RavenPortalShell>;
}
