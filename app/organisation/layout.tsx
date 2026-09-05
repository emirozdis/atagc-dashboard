import type { Metadata } from "next";
import RavenPortalShell from "@/components/raven/RavenPortalShell";

export const metadata: Metadata = { robots: { index: false, follow: false, noarchive: true } };

export default function OrganisationLayout({ children }: { children: React.ReactNode }) {
    return <RavenPortalShell>{children}</RavenPortalShell>;
}
