import RavenPortalShell from "@/components/raven/RavenPortalShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return <RavenPortalShell>{children}</RavenPortalShell>;
}
