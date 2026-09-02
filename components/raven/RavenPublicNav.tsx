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
      <div className="relative flex items-center justify-between px-4 py-3 md:hidden">
        <Link href="/" className="relative z-10 shrink-0" aria-label="RavenMUN home">
          <Image
            src="/ravenmun-logo.jpg"
            width={40}
            height={40}
            alt=""
            className="h-10 w-10 rounded-full object-cover shadow-lg shadow-black/25"
          />
        </Link>

        <span className="raven-template-brand pointer-events-none absolute inset-x-14 truncate text-center text-[1.7rem] font-bold leading-none">
          RAVENMUN
        </span>

        <Sheet>
          <SheetTrigger
            className="relative z-10 inline-flex h-11 w-11 items-center justify-center rounded-md text-white"
            aria-label="Open menu"
          >
            <Menu className="h-7 w-7" strokeWidth={2} />
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[70%] max-w-none gap-0 border-l border-[#C4B5FD]/20 bg-gradient-to-b from-[#120d1c] to-[#2a1838] p-0 shadow-[-16px_0_40px_rgb(0_0_0_/_45%)] sm:max-w-none [&>button]:hidden"
          >
            <SheetTitle className="sr-only">Site menu</SheetTitle>
            <nav className="flex flex-col pt-10" aria-label="Mobile">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-4 border-b border-white/35 px-7 py-[1.15rem] font-[family-name:var(--font-raven-display)] text-[1.35rem] text-white transition-colors",
                        isActive ? "text-[#C4B5FD]" : "hover:text-[#C4B5FD]",
                      )}
                    >
                      <Icon className="h-[1.35rem] w-[1.35rem] shrink-0" strokeWidth={1.75} />
                      {item.label}
                    </Link>
                  </SheetClose>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden items-center justify-between px-8 py-5 md:flex">
        <Link href="/" className="flex min-w-0 items-center gap-4">
          <Image
            src="/ravenmun-logo.jpg"
            width={48}
            height={48}
            alt="RavenMUN logo"
            className="h-12 w-12 shrink-0 rounded-full object-cover shadow-lg shadow-black/25"
          />
          <span className="raven-template-brand truncate text-[2.15rem] font-bold">RAVENMUN</span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            href="/apply"
            className="glassmorphism inline-flex h-[3.25rem] items-center justify-center gap-2.5 rounded-full border border-[#C4B5FD]/25 bg-[#7C3AED]/15 px-7 text-base font-medium text-white transition hover:border-[#C4B5FD]/60 hover:bg-[#7C3AED]/25 hover:text-[#C4B5FD]"
          >
            <Check className="h-5 w-5" />
            Apply
          </Link>
          {isAuthenticated ? (
            <Link
              href="/portal"
              className="inline-flex h-[3.25rem] items-center justify-center gap-2.5 rounded-full border border-white/20 bg-white/[0.04] px-7 text-base font-medium text-white transition hover:border-[#C4B5FD]/60 hover:bg-white/[0.08] hover:text-[#C4B5FD]"
            >
              <LayoutDashboard className="h-5 w-5" />
              Portal
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-[3.25rem] items-center justify-center gap-2.5 rounded-full border border-white/20 bg-white/[0.04] px-7 text-base font-medium text-white transition hover:border-[#C4B5FD]/60 hover:bg-white/[0.08] hover:text-[#C4B5FD]"
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
