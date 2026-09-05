import Link from "next/link";
import type { Metadata } from "next";
import { Mail, MapPin } from "lucide-react";
import RavenPublicShell from "@/components/raven/RavenPublicShell";
import { RAVENMUN_CONFERENCE } from "@/config/ravenmun";
import { getRavenmunOgImageUrl, RAVENMUN_OG_IMAGE } from "@/lib/raven-metadata";
import { getSiteUrl } from "@/lib/site-url";

const ogImageUrl = getRavenmunOgImageUrl(getSiteUrl());

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact the RavenMUN organizing committee about applications, committees, accessibility, and conference information.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact | RAVENMUN'26",
    description: "Contact the RavenMUN organizing committee.",
    url: "/contact",
    images: [{ url: ogImageUrl, width: RAVENMUN_OG_IMAGE.width, height: RAVENMUN_OG_IMAGE.height, alt: RAVENMUN_OG_IMAGE.alt }],
  },
  twitter: { card: "summary_large_image", title: "Contact | RAVENMUN'26", description: "Contact the RavenMUN organizing committee.", images: [ogImageUrl] },
};

export default function ContactPage() {
  return (
    <RavenPublicShell>
      <section className="mx-auto max-w-5xl px-5 pb-16 pt-10 sm:px-10 sm:pt-16">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C4B5FD]">Reach the assembly</p>
        <h1 className="raven-template-title mt-4 text-3xl font-bold tracking-tight sm:text-5xl">Contact RavenMUN.</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
          Questions about applications, committees, accessibility, or the conference itself? Our team will help you find the right place.
        </p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          <div className="raven-public-card rounded-3xl p-7">
            <Mail className="h-6 w-6 text-[#C4B5FD]" />
            <h2 className="mt-6 text-xl font-semibold text-white">Email</h2>
            <a href={`mailto:${RAVENMUN_CONFERENCE.email}`} className="mt-2 inline-block break-all text-[#C4B5FD] hover:text-white">
              {RAVENMUN_CONFERENCE.email}
            </a>
          </div>
          <div className="raven-public-card rounded-3xl p-7">
            <MapPin className="h-6 w-6 text-[#C4B5FD]" />
            <h2 className="mt-6 text-xl font-semibold text-white">Venue</h2>
            <p className="mt-2 text-white/75">{RAVENMUN_CONFERENCE.venue}</p>
            <p className="mt-1 text-sm text-white/60">
              {RAVENMUN_CONFERENCE.city}, {RAVENMUN_CONFERENCE.country}
            </p>
          </div>
        </div>
        <div className="raven-public-card mt-8 rounded-3xl border-[#7C3AED]/40 p-7">
          <h2 className="text-xl font-semibold text-white">Ready to join?</h2>
          <p className="mt-2 text-white/75">Choose the application that fits you and submit it in one sitting.</p>
          <Link href="/apply" className="glassmorphism mt-5 inline-flex rounded-full px-5 py-2.5 text-sm font-medium text-white">
            View applications
          </Link>
        </div>
      </section>
    </RavenPublicShell>
  );
}
