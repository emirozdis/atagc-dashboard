"use client";

import Link from "next/link";
import { Mail, MapPin } from "lucide-react";
import RavenPublicNav from "@/components/raven/RavenPublicNav";
import { RAVENMUN_CONFERENCE } from "@/config/ravenmun";

export default function ContactPage() {
  return <main className="min-h-screen bg-[#08070D] text-[#F5F3FF]"><RavenPublicNav /><section className="mx-auto max-w-5xl px-5 pb-20 pt-16 sm:px-10"><p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C4B5FD]">Reach the assembly</p><h1 className="mt-4 text-5xl font-semibold tracking-tight">Contact RavenMUN.</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-[#9CA3AF]">Questions about applications, committees, accessibility, or the conference itself? Our team will help you find the right place.</p><div className="mt-12 grid gap-5 sm:grid-cols-2"><div className="rounded-3xl border border-white/10 bg-[#12101A] p-7"><Mail className="h-6 w-6 text-[#C4B5FD]" /><h2 className="mt-6 text-xl font-semibold">Email</h2><p className="mt-2 text-[#9CA3AF]">The conference contact address will be published here.</p></div><div className="rounded-3xl border border-white/10 bg-[#12101A] p-7"><MapPin className="h-6 w-6 text-[#C4B5FD]" /><h2 className="mt-6 text-xl font-semibold">Venue</h2><p className="mt-2 text-[#9CA3AF]">{RAVENMUN_CONFERENCE.city}, {RAVENMUN_CONFERENCE.country}</p></div></div><div className="mt-8 rounded-3xl border border-[#7C3AED]/30 bg-[#7C3AED]/10 p-7"><h2 className="text-xl font-semibold">Ready to join?</h2><p className="mt-2 text-[#C3C7D1]">Choose the application that fits you and submit it in one sitting.</p><Link href="/apply" className="mt-5 inline-block rounded-xl bg-[#7C3AED] px-4 py-2.5 text-sm font-medium text-white">View applications</Link></div></section></main>;
}
