"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import RavenPublicShell from "@/components/raven/RavenPublicShell";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <RavenPublicShell>
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
        <section className="raven-public-card w-full max-w-lg rounded-3xl p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C4B5FD]">RavenMUN</p>
          <h1 className="raven-template-title mt-4 text-3xl font-bold">Something went wrong</h1>
          <p className="mt-3 text-sm leading-6 text-white/75">Please try again. If this continues, return to the conference website.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button className="h-12 w-full bg-[#7C3AED] px-6 text-white hover:bg-[#6D28D9] sm:w-auto" onClick={reset}>
              Try again
            </Button>
            <Button asChild variant="outline" className="h-12 w-full border-white/20 bg-transparent px-6 text-white hover:bg-white/10 sm:w-auto">
              <Link href="/">RavenMUN home</Link>
            </Button>
          </div>
        </section>
      </div>
    </RavenPublicShell>
  );
}
