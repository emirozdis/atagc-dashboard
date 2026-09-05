import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Camera, Eye, Star, User, Users } from "lucide-react";
import RavenPublicShell from "@/components/raven/RavenPublicShell";
import { RAVENMUN_APPLICATION_CARDS } from "@/config/ravenmun";
import { getRavenmunOgImageUrl, RAVENMUN_OG_IMAGE } from "@/lib/raven-metadata";
import { getSiteUrl } from "@/lib/site-url";

const ogImageUrl = getRavenmunOgImageUrl(getSiteUrl());

const icons = { user: User, star: Star, users: Users, camera: Camera, eye: Eye } as const;

export const metadata: Metadata = {
  title: "Applications",
  description: "Choose a RavenMUN 2026 application for delegate, chairboard, delegation, press, or administrative staff participation.",
  alternates: { canonical: "/apply" },
  openGraph: {
    title: "Applications | RAVENMUN'26",
    description: "Choose your path at RavenMUN 2026.",
    url: "/apply",
    images: [{ url: ogImageUrl, width: RAVENMUN_OG_IMAGE.width, height: RAVENMUN_OG_IMAGE.height, alt: RAVENMUN_OG_IMAGE.alt }],
  },
  twitter: { card: "summary_large_image", title: "Applications | RAVENMUN'26", description: "Choose your path at RavenMUN 2026.", images: [ogImageUrl] },
};

export default function ApplyPage() {
  return (
    <RavenPublicShell>
      <div className="px-4 py-10 sm:px-8 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <Link href="/" className="text-sm text-white/70 hover:text-white">← RavenMUN home</Link>
          <div className="max-w-2xl pb-10 pt-8 sm:pb-12 sm:pt-12">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C4B5FD]">Join RavenMUN</p>
            <h1 className="raven-template-title mt-4 text-3xl font-bold tracking-tight sm:text-5xl">Choose your path.</h1>
            <p className="mt-5 text-base leading-7 text-white/80 sm:text-lg sm:leading-8">Submit more than one application if you have more than one interest. Each application is reviewed separately.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {RAVENMUN_APPLICATION_CARDS.map((card) => {
              const Icon = icons[card.icon as keyof typeof icons];
              return (
                <Link key={card.type} href={`/apply/${card.type}`} className="raven-public-card group rounded-3xl p-6 transition hover:-translate-y-1">
                  <div className="mb-10 flex items-center justify-between">
                    <div className="rounded-2xl bg-[#7C3AED]/20 p-3 text-[#C4B5FD]"><Icon className="h-6 w-6" /></div>
                    <ArrowRight className="h-5 w-5 text-white/50 transition group-hover:translate-x-1 group-hover:text-[#C4B5FD]" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">{card.title}</h2>
                  <p className="mt-3 min-h-14 text-sm leading-6 text-white/70">{card.description}</p>
                  <p className="mt-7 text-sm font-medium text-[#C4B5FD]">Start application</p>
                </Link>
              );
            })}
          </div>
          <p className="mt-10 text-sm text-white/70">Already applied? <Link href="/login" className="text-[#C4B5FD] hover:text-white">Sign in to your portal</Link></p>
        </div>
      </div>
    </RavenPublicShell>
  );
}
