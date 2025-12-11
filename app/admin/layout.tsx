import { Sidebar } from "@/components/app/dashboard/Sidebar";
import { Header } from "@/components/app/dashboard/Header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden md:flex flex-col w-64 fixed inset-y-0 z-50">
        <Sidebar isAdminSection={true} />
      </div>
      <div className="flex-1 flex flex-col md:pl-64 h-full">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
