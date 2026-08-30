import RavenPortalShell from "@/components/raven/RavenPortalShell";

export default function SharedLayout({ children }: { children: React.ReactNode }) {
    return <RavenPortalShell>{children}</RavenPortalShell>;
}
