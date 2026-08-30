"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";

type Invite = { email: string; expiresAt: string; delegationName: string };

function DelegationInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const legacyMagiclinkId = searchParams.get("magiclink") || "";
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState("");
  const endpoint = token
    ? `/api/delegations/invites/${encodeURIComponent(token)}`
    : legacyMagiclinkId
      ? `/api/delegations/magiclinks/${encodeURIComponent(legacyMagiclinkId)}`
      : "";

  useEffect(() => {
    if (!endpoint) return;

    const controller = new AbortController();
    fetch(endpoint, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || result.error || "Invitation is invalid.");
        return result as Invite;
      })
      .then(setInvite)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Invitation is invalid.");
      });

    return () => controller.abort();
  }, [endpoint]);

  const missingInvitation = !endpoint;
  if (!invite && !error && !missingInvitation) {
    return <div className="flex min-h-screen items-center justify-center bg-[#08070D] text-[#C4B5FD]"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const displayError = error || (missingInvitation ? "Invitation is missing." : "");
  const applicationQuery = token ? `invite=${encodeURIComponent(token)}` : `magiclink=${encodeURIComponent(legacyMagiclinkId)}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#08070D] px-4 text-[#F5F3FF]">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#12101A] p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#7C3AED]/15 text-[#C4B5FD]"><ShieldCheck className="h-8 w-8" /></div>
        {displayError ? (
          <>
            <h1 className="mt-6 text-2xl font-semibold">Invitation unavailable</h1>
            <p className="mt-3 text-[#9CA3AF]">{displayError}</p>
            <Link href="/" className="mt-7 inline-block text-sm text-[#C4B5FD]">Back to RavenMUN</Link>
          </>
        ) : (
          <>
            <p className="mt-7 text-xs uppercase tracking-[0.25em] text-[#C4B5FD]">Delegation invitation</p>
            <h1 className="mt-3 text-3xl font-semibold">Join {invite?.delegationName}</h1>
            <p className="mt-4 leading-7 text-[#9CA3AF]">You were invited using <strong className="text-[#F5F3FF]">{invite?.email}</strong>. Continue to verify this email and complete your individual Delegate application.</p>
            <Link href={`/apply/delegate?${applicationQuery}`} className="mt-8 inline-flex items-center rounded-xl bg-[#7C3AED] px-5 py-3 font-medium text-white hover:bg-[#6D28D9]">Continue to application <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </>
        )}
      </section>
    </main>
  );
}

export default function DelegationInvitePage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#08070D] text-[#C4B5FD]"><Loader2 className="h-6 w-6 animate-spin" /></div>}><DelegationInviteContent /></Suspense>;
}
