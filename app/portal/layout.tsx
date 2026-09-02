import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import RavenPortalShell from "@/components/raven/RavenPortalShell";
import { authOptions } from "@/lib/auth";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=/portal");
  return <RavenPortalShell>{children}</RavenPortalShell>;
}
