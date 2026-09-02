"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Compass, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import RavenPublicShell from "@/components/raven/RavenPublicShell";

export default function NotFound() {
  const router = useRouter();

  return (
    <RavenPublicShell>
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
        <section className="raven-public-card w-full max-w-lg rounded-3xl p-8">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-[#C4B5FD]/30 bg-[#7C3AED]/15">
            <Compass className="h-12 w-12 text-[#C4B5FD]" />
          </div>
          <h1 className="raven-template-title mt-6 text-7xl font-bold tracking-tighter md:text-8xl">404</h1>
          <h2 className="mt-4 text-2xl font-semibold text-white md:text-3xl">Page not found</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/75 md:text-base">
            The page you requested does not exist. Return to the conference website or participant portal.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button variant="outline" className="h-12 w-full border-white/20 bg-transparent px-6 text-white hover:bg-white/10 sm:w-auto" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go back
            </Button>
            <Button asChild className="h-12 w-full bg-[#7C3AED] px-6 text-white hover:bg-[#6D28D9] sm:w-auto">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                RavenMUN home
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </RavenPublicShell>
  );
}
