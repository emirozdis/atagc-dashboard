"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Home, LayoutDashboard, LogIn, Mail, Menu } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const publicLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/apply", label: "Apply", icon: Check },
  { href: "/contact", label: "Contact", icon: Mail },
] as const;

export default function RavenPublicNav() {
  const { status } = useSession();
  const pathname = usePathname();
  const isAuthenticated = status === "authenticated";
  const authLink = isAuthenticated
    ? { href: "/portal", label: "Portal", icon: LayoutDashboard }
    : { href: "/login", label: "Sign in", icon: LogIn };

  const menuItems = [...publicLinks, authLink];

  return (
    <header className="relative z-40 w-full border-b border-white/15 bg-black/30">
      <div className="relative flex items-center justify-between px-0 py-2 md:hidden">
        <Link href="/" className="relative z-10 ml-4 shrink-0" aria-label="RavenMUN home">
          <Image
            src="/ravenmun-logo-optimized.jpg"
            width={50}
            height={50}
            alt=""
            className="h-[50px] w-[50px] rounded-full object-cover shadow-lg shadow-black/25"
          />
        </Link>

        <span className="raven-template-brand pointer-events-none absolute inset-x-14 truncate text-center text-2xl font-bold leading-none">
          RAVENMUN
        </span>

        <Sheet>
          <SheetTrigger
            className="relative z-10 mr-4 inline-flex h-9 w-9 items-center justify-center rounded-md text-white"
            aria-label="Open menu"
          >
            <Menu className="h-9 w-9" strokeWidth={2} />
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-64 max-w-none gap-0 border-l border-[#C4B5FD]/20 bg-[var(--background)] p-0 shadow-[-16px_0_40px_rgb(0_0_0_/_45%)] sm:max-w-none [&>button]:hidden"
          >
            <SheetTitle className="sr-only">Site menu</SheetTitle>
            <nav className="flex flex-col gap-0 px-6 pt-20" aria-label="Mobile">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-1.5 border-b border-white/35 py-4 font-[family-name:var(--font-raven-display)] text-2xl text-white transition-colors",
                        isActive ? "text-[#C4B5FD]" : "hover:text-[#C4B5FD]",
                      )}
                    >
                      <Icon className="h-6 w-6 shrink-0" strokeWidth={1.75} />
                      {item.label}
                    </Link>
                  </SheetClose>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      <div className="raven-public-nav-desktop hidden items-center justify-between md:flex">
        <Link href="/" className="raven-public-nav-brand flex min-w-0 items-center">
          <Image
            src="/ravenmun-logo-optimized.jpg"
            width={48}
            height={48}
            alt="RavenMUN logo"
            className="raven-public-nav-logo shrink-0 rounded-full object-cover shadow-lg shadow-black/25"
          />
          <span className="raven-public-nav-title raven-template-brand truncate font-bold">RAVENMUN</span>
        </Link>

        <nav className="raven-public-nav-links flex items-center">
          <Link
            href="/apply"
            className="raven-public-nav-action glassmorphism inline-flex items-center justify-center rounded-full border border-[#C4B5FD]/25 bg-[#7C3AED]/15 font-medium text-white transition hover:border-[#C4B5FD]/60 hover:bg-[#7C3AED]/25 hover:text-[#C4B5FD]"
          >
            <Check className="h-5 w-5" />
            Apply
          </Link>
          {isAuthenticated ? (
            <Link
              href="/portal"
              className="raven-public-nav-action inline-flex items-center justify-center rounded-full border border-white/20 bg-white/[0.04] font-medium text-white transition hover:border-[#C4B5FD]/60 hover:bg-white/[0.08] hover:text-[#C4B5FD]"
            >
              <LayoutDashboard className="h-5 w-5" />
              Portal
            </Link>
          ) : (
            <Link
              href="/login"
              className="raven-public-nav-action inline-flex items-center justify-center rounded-full border border-white/20 bg-white/[0.04] font-medium text-white transition hover:border-[#C4B5FD]/60 hover:bg-white/[0.08] hover:text-[#C4B5FD]"
            >
              <LogIn className="h-5 w-5" />
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
