"use client";

import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Bell, ClipboardList, FileCog, LayoutDashboard, LogOut, PanelLeftClose, PanelLeftOpen, Settings, Shield, Users, UsersRound, PenLine, CreditCard, Utensils, BookOpen, MessageSquare, ScrollText } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";

const links = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/applications", label: "Applications", icon: ClipboardList },
  { href: "/admin/users", label: "People and roles", icon: Users },
  { href: "/admin/committees", label: "Committees", icon: UsersRound },
  { href: "/admin/forms", label: "Application forms", icon: FileCog },
  { href: "/admin/announcements", label: "Announcements", icon: Bell },
  { href: "/admin/content", label: "Public content", icon: PenLine },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/catering", label: "Catering", icon: Utensils },
  { href: "/admin/resources", label: "Resources", icon: BookOpen },
  { href: "/admin/tickets", label: "Support tickets", icon: MessageSquare },
  { href: "/admin/roll-call", label: "Roll call", icon: ScrollText },
  { href: "/admin/documents", label: "Documents", icon: FileCog },
  { href: "/admin/logs", label: "Audit logs", icon: ScrollText },
  { href: "/admin/settings", label: "Conference settings", icon: Settings },
];

export default function RavenAdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  return <div className="min-h-screen bg-[#08070D] text-[#F5F3FF] lg:flex">{sidebarVisible && <aside className="border-b border-white/10 bg-[#12101A] lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r"><div className="flex items-center gap-3 px-5 py-5 lg:px-6 lg:py-7"><Image src="/ravenmun-logo.jpg" width={34} height={34} alt="RavenMUN logo" className="h-[34px] w-[34px] rounded-full object-cover" /><div><Link href="/admin" className="raven-template-brand text-lg font-semibold tracking-wide">RAVENMUN</Link><p className="mt-1 text-xs text-[#9CA3AF]">Administration</p></div></div><nav className="flex gap-1 overflow-x-auto px-3 pb-4 lg:block lg:space-y-1 lg:px-4">{links.map(({ href, label, icon: Icon }) => { const active = pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`)); return <Link key={href} href={href} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${active ? "bg-[#7C3AED]/20 text-white" : "text-[#9CA3AF] hover:bg-white/5 hover:text-white"}`}><Icon className="h-4 w-4" />{label}</Link>; })}</nav><div className="hidden px-4 pt-8 lg:block"><Link href="/portal" className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#9CA3AF] hover:bg-white/5 hover:text-white"><Shield className="h-4 w-4" />Participant portal</Link><button onClick={() => signOut({ callbackUrl: "/login" })} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#9CA3AF] hover:bg-white/5 hover:text-white"><LogOut className="h-4 w-4" />Sign out</button></div></aside>}<div className="min-w-0 flex-1"><header className="flex items-center gap-3 border-b border-white/10 px-5 py-5 sm:px-8"><button aria-label={sidebarVisible ? "Hide navigation" : "Show navigation"} onClick={() => setSidebarVisible((visible) => !visible)} className="rounded-xl border border-white/10 p-2 text-[#C4B5FD] hover:bg-white/5">{sidebarVisible ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}</button><p className="raven-template-brand text-xs uppercase tracking-[0.24em]">RavenMUN control center</p></header><main>{children}</main></div></div>;
}
