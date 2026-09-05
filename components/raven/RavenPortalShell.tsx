"use client";

import Image from "next/image";
import { ReactNode } from "react";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  BookOpen,
  Camera,
  FileText,
  GalleryHorizontal,
  Home,
  LogOut,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  ScanLine,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  Utensils,
  Vote,
  Wallet,
} from "lucide-react";
import { getEffectiveRole, STAFF_ROLES } from "@/lib/roles";

type PortalApplication = { application_type: string; status: string };
type PortalApplicationData = { applications?: PortalApplication[]; delegation?: { id: string } | null };
type PortalNavItem = { href: string; label: string; icon: typeof Home };

const roleLabels: Record<string, string> = {
  applicant: "Applicant",
  delegate: "Delegate",
  committee_chairman: "Chairboard",
  chair: "Chairboard",
  press: "Press",
  head_press: "Head of Press",
  observer: "Administrative Staff",
  head_observer: "Head of Administrative Staff",
  security: "Security",
  head_security: "Head of Security",
  admin: "Site admin",
  superadmin: "Super admin",
};

export default function RavenPortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const actualRole = session?.user?.role || "applicant";
  const role = session?.user ? getEffectiveRole(session.user) : "applicant";
  const isStaff = STAFF_ROLES.includes(actualRole);
  const isApproved = isStaff || session?.user?.applicationStatus === "approved" || session?.user?.applicationStatus === "accepted";

  const { data: applicationData } = useQuery<PortalApplicationData>({
    queryKey: ["portal-nav-applications", session?.user?.id],
    queryFn: async () => {
      const response = await fetch("/api/applications/mine");
      if (!response.ok) throw new Error("Unable to load applications.");
      return response.json();
    },
    enabled: Boolean(session?.user?.id),
    staleTime: 60_000,
  });

  const hasDelegation = Boolean(
    applicationData?.delegation
    || applicationData?.applications?.some((application) => application.application_type === "delegation"),
  );
  const items: PortalNavItem[] = [
    { href: "/portal", label: "Overview", icon: Home },
    { href: "/portal/applications", label: "My applications", icon: FileText },
    { href: "/profile", label: "Profile", icon: UserRound },
    ...(hasDelegation ? [{ href: "/portal/delegation", label: "My delegation", icon: Users }] : []),
    ...(isApproved ? getApprovedItems(role) : []),
    { href: "/tickets", label: "Support", icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-[#08070D] text-[#F5F3FF] lg:flex">
      {sidebarVisible && <aside className="border-b border-white/10 bg-[#12101A] lg:min-h-screen lg:w-80 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3.5 px-5 py-5 lg:px-6 lg:py-8">
      <Image src="/ravenmun-logo-optimized.jpg" width={42} height={42} alt="RavenMUN logo" className="h-[42px] w-[42px] rounded-full object-cover" />
          <div>
            <Link href="/portal" className="raven-template-brand text-xl font-bold tracking-wide">RAVENMUN</Link>
            <p className="mt-0.5 text-sm text-[#9CA3AF]">Participant portal</p>
          </div>
        </div>
        <div className="hidden px-6 pb-7 lg:block">
          <div className="rounded-2xl border border-[#7C3AED]/20 bg-[#7C3AED]/10 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#C4B5FD]/15 p-2.5 text-[#C4B5FD]"><UserRound className="h-5 w-5" /></div>
              <div className="min-w-0">
                <p className="truncate text-base font-medium">{session?.user?.name || session?.user?.email}</p>
                <p className="text-sm text-[#9CA3AF]">{roleLabels[role] || role}</p>
              </div>
            </div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1.5 lg:px-4 lg:pb-0">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/portal" && pathname.startsWith(`${href}/`));
            return <Link key={href} href={href} className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition lg:gap-3.5 lg:px-3.5 lg:py-3 lg:text-base ${active ? "bg-[#7C3AED]/20 text-[#F5F3FF]" : "text-[#9CA3AF] hover:bg-white/5 hover:text-white"}`}><Icon className="h-4 w-4 lg:h-5 lg:w-5" />{label}</Link>;
          })}
        </nav>
        <div className="hidden px-4 pt-8 lg:block">
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-base text-[#9CA3AF] hover:bg-white/5 hover:text-white"><LogOut className="h-5 w-5" />Sign out</button>
        </div>
      </aside>}
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3"><button aria-label={sidebarVisible ? "Hide navigation" : "Show navigation"} onClick={() => setSidebarVisible((visible) => !visible)} className="rounded-xl border border-white/10 p-2.5 text-[#C4B5FD] hover:bg-white/5">{sidebarVisible ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}</button><div><p className="raven-template-brand text-sm uppercase tracking-[0.24em]">RavenMUN 2026</p><p className="mt-1 text-base text-[#C3C7D1]">Your conference workspace</p></div></div>
          <button aria-label="Open profile and devices" onClick={() => router.push("/profile#devices")} className="rounded-xl border border-white/10 p-2.5 text-[#C4B5FD] hover:bg-white/5"><Settings className="h-5 w-5" /></button>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}

function getApprovedItems(role: string): PortalNavItem[] {
  const items: PortalNavItem[] = [];
  if (["delegate", "committee_chairman", "chair"].includes(role)) {
    items.push(
      { href: "/dashboard/committee", label: "My committee", icon: Users },
      ...(role === "committee_chairman" || role === "chair" ? [{ href: "/dashboard/committee/roll-call", label: "Roll call", icon: Vote }] : []),
      { href: "/dashboard/editor", label: "Committee workspace", icon: BookOpen },
    );
  }
  if (["press", "head_press"].includes(role)) items.push({ href: "/gallery", label: "Press gallery", icon: Camera }, { href: "/organisation/press/upload", label: "Upload media", icon: Camera });
  if (["observer", "head_observer"].includes(role)) items.push({ href: "/organisation/observers/my-tasks", label: "Staff tasks", icon: FileText }, ...(role === "head_observer" ? [{ href: "/organisation/observers/tasks", label: "Manage tasks", icon: Users }] : []));
  if (["security", "head_security"].includes(role)) items.push({ href: "/organisation/security/scan", label: "Scan entry", icon: ScanLine }, ...(role === "head_security" ? [{ href: "/organisation/security/logs", label: "Entry logs", icon: ShieldCheck }] : []));

  items.push(
    { href: "/announcements", label: "Announcements", icon: Bell },
    { href: "/resources", label: "Resources", icon: BookOpen },
    { href: "/gallery", label: "Gallery", icon: GalleryHorizontal },
    { href: "/connections", label: "Connections", icon: Users },
    { href: "/catering", label: "Catering", icon: Utensils },
  );
  if (["delegate", "press", "head_press", "observer", "head_observer"].includes(role)) items.push({ href: "/payment", label: "Payment", icon: Wallet });
  return items;
}
