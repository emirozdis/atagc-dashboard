import RavenPortalShell from "@/components/raven/RavenPortalShell";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <RavenPortalShell>{children}</RavenPortalShell>;
}
