import Link from "next/link";

export default function ResetPasswordPage() {
  return <main className="flex min-h-screen items-center justify-center bg-[#08070D] px-5 text-[#F5F3FF]"><section className="max-w-md rounded-3xl border border-white/10 bg-[#12101A] p-8 text-center"><h1 className="text-2xl font-semibold">Passwordless sign-in</h1><p className="mt-3 text-sm leading-6 text-[#9CA3AF]">Passwords are not used by RavenMUN. Sign in with a one-time email code instead.</p><Link href="/login" className="mt-6 inline-block rounded-xl bg-[#7C3AED] px-4 py-2.5 text-sm font-medium text-white">Go to sign in</Link></section></main>;
}
