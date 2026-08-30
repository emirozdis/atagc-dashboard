import RavenAdminShell from "@/components/raven/RavenAdminShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RavenAdminShell>{children}</RavenAdminShell>;
}
