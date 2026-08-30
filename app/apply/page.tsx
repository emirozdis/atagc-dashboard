import Link from "next/link";
import { ArrowRight, Camera, Eye, Star, User, Users } from "lucide-react";
import RavenPublicNav from "@/components/raven/RavenPublicNav";
import { RAVENMUN_APPLICATION_CARDS } from "@/config/ravenmun";

const icons = { user: User, star: Star, users: Users, camera: Camera, eye: Eye } as const;

export default function ApplyPage() {
  return (
    <main className="min-h-screen bg-[#08070D] text-[#F5F3FF]">
      <RavenPublicNav />
      <div className="px-4 py-14 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-[#9CA3AF] hover:text-white">← RavenMUN home</Link>
        <div className="max-w-2xl pb-12 pt-12"><p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C4B5FD]">Join RavenMUN</p><h1 className="mt-4 text-5xl font-semibold tracking-tight">Choose your path.</h1><p className="mt-5 text-lg leading-8 text-[#9CA3AF]">Submit more than one application if you have more than one interest. Each application is reviewed separately.</p></div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {RAVENMUN_APPLICATION_CARDS.map((card) => { const Icon = icons[card.icon as keyof typeof icons]; return <Link key={card.type} href={`/apply/${card.type}`} className="group rounded-3xl border border-white/10 bg-[#12101A] p-6 transition hover:-translate-y-1 hover:border-[#7C3AED]/60 hover:bg-[#1B1727]"><div className="mb-10 flex items-center justify-between"><div className="rounded-2xl bg-[#7C3AED]/15 p-3 text-[#C4B5FD]"><Icon className="h-6 w-6" /></div><ArrowRight className="h-5 w-5 text-[#9CA3AF] transition group-hover:translate-x-1 group-hover:text-[#C4B5FD]" /></div><h2 className="text-xl font-semibold">{card.title}</h2><p className="mt-3 min-h-14 text-sm leading-6 text-[#9CA3AF]">{card.description}</p><p className="mt-7 text-sm font-medium text-[#C4B5FD]">Start application</p></Link>; })}
        </div>
        <p className="mt-10 text-sm text-[#9CA3AF]">Already applied? <Link href="/login" className="text-[#C4B5FD] hover:text-white">Sign in to your portal</Link></p>
      </div>
      </div>
    </main>
  );
}
