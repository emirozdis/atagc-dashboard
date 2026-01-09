import { AdminSidebar } from "@/components/dashboard/AdminSidebar";
import { Header } from "@/components/dashboard/Header";
import { AdminMobileNav } from "@/components/dashboard/AdminMobileNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      {/* Background decoration matching Login */}
      <div className="fixed inset-0 -z-10 bg-background">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
      </div>

      <div className="hidden md:flex flex-col w-64 fixed inset-y-0 z-50">
        <AdminSidebar />
      </div>
      <div className="flex-1 flex flex-col md:pl-64 h-full relative z-0 overflow-x-hidden">
        <Header />
        {/* Adjusted padding: p-4 for mobile, pb-20 + pb-safe to clear bottom nav */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 pb-safe md:pb-8">
          {children}
        </main>
        <AdminMobileNav />
      </div>
    </div>
  );
}

// Change Log:
// - Imported and added `AdminMobileNav` component.
// - Added `pb-24` to `main` container on mobile to prevent content from being hidden behind the bottom navigation.
// - Maintained `p-4` padding for mobile consistent with previous fixes.