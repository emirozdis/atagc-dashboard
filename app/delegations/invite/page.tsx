"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import RavenPublicShell from "@/components/raven/RavenPublicShell";

type Invite = { email: string; expiresAt: string; delegationName: string };

function InviteLoading() {
  return (
    <RavenPublicShell showFooter={false}>
      <div className="flex min-h-[60vh] items-center justify-center text-[#C4B5FD]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    </RavenPublicShell>
  );
}

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
    return <InviteLoading />;
  }

  const displayError = error || (missingInvitation ? "Invitation is missing." : "");
  const applicationQuery = token ? `invite=${encodeURIComponent(token)}` : `magiclink=${encodeURIComponent(legacyMagiclinkId)}`;

  return (
    <RavenPublicShell>
      <div className="flex items-center justify-center px-4 py-16">
        <section className="raven-public-card w-full max-w-lg rounded-3xl p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#7C3AED]/15 text-[#C4B5FD]"><ShieldCheck className="h-8 w-8" /></div>
          {displayError ? (
            <>
              <h1 className="raven-template-title mt-6 text-2xl font-bold">Invitation unavailable</h1>
              <p className="mt-3 text-white/75">{displayError}</p>
              <Link href="/" className="mt-7 inline-block text-sm text-[#C4B5FD] hover:text-white">Back to RavenMUN</Link>
            </>
          ) : (
            <>
              <p className="mt-7 text-xs uppercase tracking-[0.25em] text-[#C4B5FD]">Delegation invitation</p>
              <h1 className="raven-template-title mt-3 text-3xl font-bold">Join {invite?.delegationName}</h1>
              <p className="mt-4 leading-7 text-white/75">You were invited using <strong className="text-white">{invite?.email}</strong>. Continue to verify this email and complete your individual Delegate application.</p>
              <Link href={`/apply/delegate?${applicationQuery}`} className="mt-8 inline-flex items-center rounded-xl bg-[#7C3AED] px-5 py-3 font-medium text-white hover:bg-[#6D28D9]">Continue to application <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </>
          )}
        </section>
      </div>
    </RavenPublicShell>
  );
}

export default function DelegationInvitePage() {
  return (
    <Suspense fallback={<InviteLoading />}>
      <DelegationInviteContent />
    </Suspense>
  );
}
