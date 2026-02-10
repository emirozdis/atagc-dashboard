import { OrganisationSidebar } from "@/components/organisation/OrganisationSidebar";
import { Header } from "@/components/dashboard/Header";
import { OrganisationMobileNav } from "@/components/organisation/OrganisationMobileNav";
import { RoleSyncer } from "@/components/dashboard/RoleSyncer";

export default function OrganisationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      <div className="fixed inset-0 -z-10 bg-background">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
      </div>

      <div className="hidden md:flex flex-col w-64 fixed inset-y-0 z-50">
        <OrganisationSidebar />
      </div>
      <div className="flex-1 flex flex-col md:pl-64 h-full relative z-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 pb-safe md:pb-8">
          {children}
        </main>
        <OrganisationMobileNav />
      </div>

      <RoleSyncer />
    </div>
  );
}
