"use client";

import Link from "next/link";
import RavenPublicShell from "@/components/raven/RavenPublicShell";

interface DelegationFormProps {
    magiclinkId: string;
    magiclinkEmail: string;
}

/**
 * Compatibility entry point for the retired magic-link form.
 *
 * Delegation invitations now use the same passwordless application flow as
 * every other delegate. Keeping this handoff prevents older callers from
 * reaching the removed password-based credentials provider.
 */
export function DelegationForm({ magiclinkId, magiclinkEmail }: DelegationFormProps) {
    const query = new URLSearchParams({ magiclink: magiclinkId }).toString();

    return (
        <RavenPublicShell showFooter={false}>
            <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-4 py-12">
                <section className="raven-public-card w-full rounded-3xl p-8 text-center">
                    <p className="text-xs uppercase tracking-[0.25em] text-[#C4B5FD]">Delegation invitation</p>
                    <h1 className="raven-template-title mt-4 text-3xl font-bold">Continue your delegate application</h1>
                    <p className="mt-4 leading-7 text-white/75">
                        This invitation is for <strong className="text-white">{magiclinkEmail}</strong>. Verify your email on the delegate application page to join the delegation.
                    </p>
                    <Link
                        href={`/apply/delegate?${query}`}
                        className="mt-8 inline-flex rounded-xl bg-[#7C3AED] px-5 py-3 font-medium text-white hover:bg-[#6D28D9]"
                    >
                        Continue to application
                    </Link>
                </section>
            </div>
        </RavenPublicShell>
    );
}
