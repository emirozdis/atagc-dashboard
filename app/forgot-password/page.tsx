import Link from "next/link";
import RavenPublicShell from "@/components/raven/RavenPublicShell";

export default function ForgotPasswordPage() {
  return (
    <RavenPublicShell>
      <div className="flex items-center justify-center px-5 py-16">
        <section className="raven-public-card w-full max-w-md rounded-3xl p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C4B5FD]">RavenMUN</p>
          <h1 className="raven-template-title mt-4 text-2xl font-bold">No password to reset</h1>
          <p className="mt-3 text-sm leading-6 text-white/75">RavenMUN uses a one-time email code. Request a fresh code whenever you need to sign in.</p>
          <Link href="/login" className="mt-6 inline-block rounded-xl bg-[#7C3AED] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6D28D9]">Go to sign in</Link>
        </section>
      </div>
    </RavenPublicShell>
  );
}
