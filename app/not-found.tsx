"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Compass, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-background">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-secondary/20 blur-3xl" />
      </div>
      <div className="w-full max-w-lg space-y-6 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-primary/20 bg-primary/10 shadow-inner">
          <Compass className="h-12 w-12 text-primary" />
        </div>
        <div className="space-y-4">
          <h1 className="text-7xl font-bold tracking-tighter text-foreground drop-shadow-sm md:text-8xl">4<span className="text-primary">0</span>4</h1>
          <h2 className="text-2xl font-semibold text-foreground md:text-3xl">Page not found</h2>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground md:text-base">
            The page you requested does not exist. Return to the conference website or participant portal.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 pt-6 sm:flex-row">
          <Button variant="outline" className="h-12 w-full px-6 sm:w-auto" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back
          </Button>
          <Button asChild className="h-12 w-full px-6 sm:w-auto">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              RavenMUN home
            </Link>
          </Button>
        </div>
      </div>
      <div className="absolute bottom-8 w-full text-center text-xs text-muted-foreground/50">RavenMUN 2026</div>
    </div>
  );
}
