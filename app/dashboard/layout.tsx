import { Sidebar } from "@/components/app/dashboard/Sidebar";
import { Header } from "@/components/app/dashboard/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#181818] relative">
      {/* Background decoration matching Login */}
      <div className="fixed inset-0 -z-10 bg-[#181818]">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="hidden md:flex flex-col w-64 fixed inset-y-0 z-50">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col md:pl-64 h-full relative z-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

// Change Log:
// - Updated background color to `#181818`.
// - Added background gradient blobs to match Login page.