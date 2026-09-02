"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, KeyRound, Loader2, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TURNSTILE_SITE_KEY, Turnstile } from "@/components/ui/turnstile";
import RavenPublicShell from "@/components/raven/RavenPublicShell";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [mode, setMode] = useState<"email" | "device">("email");
  const [deviceCode, setDeviceCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    if (!turnstileToken) {
      setMessage("Please complete the security verification first.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/challenges/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "login", turnstileToken }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || result.error || "Unable to send code.");
      setChallengeId(result.challengeId);
      setMessage("A sign-in code has been sent to your email.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send code.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (!challengeId) return;
    setLoading(true);
    setMessage("");
    try {
      const verifyResponse = await fetch("/api/auth/challenges/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, email, purpose: "login", code }),
      });
      const verification = await verifyResponse.json();
      if (!verifyResponse.ok) throw new Error(verification.message || verification.error || "Invalid code.");

      await finishSignIn(verification.exchangeToken);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to verify code.");
    } finally {
      setLoading(false);
    }
  }

  async function finishSignIn(exchangeToken: string) {
      const result = await signIn("passwordless", { exchangeToken, redirect: false });
      if (result?.error) throw new Error("Unable to start your session.");

      const sessionResponse = await fetch("/api/auth/session");
      const session = await sessionResponse.json();
      const callbackUrl = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("callbackUrl") : null;
      if (callbackUrl?.startsWith("/")) router.push(callbackUrl);
      else if (session?.user?.role === "superadmin" || session?.user?.role === "admin") router.push("/admin");
      else router.push("/portal");
      router.refresh();
  }

  async function verifyDeviceCode(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/device-codes/exchange", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: deviceCode }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || result.error || "Invalid device code.");
      await finishSignIn(result.exchangeToken);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in with device code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <RavenPublicShell>
      <div className="relative flex items-center justify-center px-4 py-10 md:min-h-[calc(100dvh-8rem)]">
        <section className="raven-public-card relative w-full max-w-md rounded-3xl p-5 sm:p-8">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#C4B5FD]/30 bg-[#7C3AED]/15 text-[#C4B5FD]">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C4B5FD]">RavenMUN</p>
            <h1 className="raven-template-title mt-3 text-3xl font-bold">Welcome back</h1>
            <p className="mt-2 text-sm text-white/70">Sign in securely with your email. No password required.</p>
          </div>

          {mode === "device" ? (
            <form onSubmit={verifyDeviceCode} className="space-y-5">
              <div className="rounded-2xl border border-[#7C3AED]/30 bg-[#7C3AED]/10 p-4 text-sm text-[#C3C7D1]">Generate a pairing code from a device where you are already signed in. It works once and expires in ten minutes.</div>
              <div className="space-y-2"><Label htmlFor="device-code" className="text-[#C3C7D1]">Device pairing code</Label><Input id="device-code" required value={deviceCode} onChange={(event) => setDeviceCode(event.target.value.toUpperCase())} placeholder="AB12CD34EF" className="border-white/10 bg-black/20 text-center font-mono tracking-[0.2em] text-white" /></div>
              <Button type="submit" disabled={loading || deviceCode.length < 8} className="w-full bg-[#7C3AED] text-white hover:bg-[#6D28D9]">{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Use device code</Button>
              <button type="button" onClick={() => { setMode("email"); setDeviceCode(""); setMessage(""); }} className="w-full text-sm text-[#C4B5FD] hover:text-white">Sign in by email instead</button>
            </form>
          ) : !challengeId ? (
            <form onSubmit={requestCode} className="space-y-5">
              <div className="space-y-2"><Label htmlFor="email" className="text-[#C3C7D1]">Email address</Label><div className="relative"><Mail className="absolute top-3 left-3 h-4 w-4 text-[#C4B5FD]" /><Input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="border-white/10 bg-black/20 pl-10 text-white" /></div></div>
              {TURNSTILE_SITE_KEY ? <Turnstile siteKey={TURNSTILE_SITE_KEY} onVerify={setTurnstileToken} onError={() => setTurnstileToken("")} onExpire={() => setTurnstileToken("")} /> : <p className="text-sm text-rose-300">Security verification is not configured.</p>}
              <Button type="submit" disabled={loading || !turnstileToken} className="w-full bg-[#7C3AED] text-white hover:bg-[#6D28D9]">{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}Email me a sign-in code</Button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="space-y-5">
              <div className="rounded-2xl border border-[#7C3AED]/30 bg-[#7C3AED]/10 p-4 text-sm text-[#C3C7D1]">
                Code sent to <strong className="text-white">{email}</strong>. Check your inbox and enter the six-digit code.
              </div>
              <div className="space-y-2"><Label htmlFor="code" className="text-[#C3C7D1]">Six-digit code</Label><div className="relative"><KeyRound className="absolute top-3 left-3 h-4 w-4 text-[#C4B5FD]" /><Input id="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" className="border-white/10 bg-black/20 pl-10 text-center font-mono tracking-[0.4em] text-white" /></div></div>
              <Button type="submit" disabled={loading || code.length !== 6} className="w-full bg-[#7C3AED] text-white hover:bg-[#6D28D9]">{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Verify and sign in</Button>
              <button type="button" onClick={() => { setChallengeId(null); setCode(""); setTurnstileToken(""); setMessage(""); }} className="w-full text-sm text-[#C4B5FD] hover:text-white">Use a different email</button>
            </form>
          )}

          {message && <p className="mt-5 text-center text-sm text-[#C4B5FD]">{message}</p>}
          {mode === "email" && <button type="button" onClick={() => { setMode("device"); setChallengeId(null); setCode(""); setMessage(""); }} className="mt-6 w-full text-center text-sm text-[#C4B5FD] hover:text-white">Have a code from another signed-in device?</button>}
          <p className="mt-8 text-center text-sm text-white/70">Need to apply? <Link href="/apply" className="text-[#C4B5FD] hover:text-white">View applications</Link></p>
        </section>
      </div>
    </RavenPublicShell>
  );
}
