"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, LayoutDashboard, LogIn } from "lucide-react";
import { useSession } from "next-auth/react";

export default function RavenPublicNav() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  return (
    <header className="relative z-40 w-full border-b border-white/15 bg-black/10">
      <div className="flex items-center justify-between px-6 py-3 max-sm:px-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/ravenmun-logo.jpg"
            width={36}
            height={36}
            priority
            alt="RavenMUN logo"
            className="h-9 w-9 rounded-full object-cover shadow-lg shadow-black/25 max-sm:h-8 max-sm:w-8"
          />
          <span className="raven-template-brand text-2xl font-bold max-sm:text-xl">RAVENMUN</span>
        </Link>

        <nav className="flex items-center gap-2.5 sm:gap-3">
          <Link href="/apply" className="glassmorphism inline-flex h-11 items-center gap-2 rounded-full border border-[#C4B5FD]/25 bg-[#7C3AED]/15 px-5 text-sm font-medium text-white transition hover:border-[#C4B5FD]/60 hover:bg-[#7C3AED]/25 hover:text-[#C4B5FD] sm:px-6">
            <Check className="h-4 w-4" />
            Apply
          </Link>
          {isAuthenticated ? (
            <Link href="/portal" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-5 text-sm font-medium text-white transition hover:border-[#C4B5FD]/60 hover:bg-white/[0.08] hover:text-[#C4B5FD] sm:px-6">
              <LayoutDashboard className="h-4 w-4" />
              Portal
            </Link>
          ) : (
            <Link href="/login" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-5 text-sm font-medium text-white transition hover:border-[#C4B5FD]/60 hover:bg-white/[0.08] hover:text-[#C4B5FD] sm:px-6">
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
