import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import RavenCountdown from "@/components/raven/RavenCountdown";
import RavenHomeBackground from "@/components/raven/RavenHomeBackground";
import RavenPublicNav from "@/components/raven/RavenPublicNav";
import { RAVENMUN_CONFERENCE } from "@/config/ravenmun";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/SERVER_supabase";

export const metadata: Metadata = {
  title: { absolute: "RAVENMUN'26" },
  description: RAVENMUN_CONFERENCE.fullName,
  alternates: { canonical: "/" },
};

function formatConferenceDates(startDateIso: string | null, endDateIso: string | null) {
  if (!startDateIso) return RAVENMUN_CONFERENCE.dates;
  const conferenceDay = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(new Date(startDateIso));
  if (conferenceDay === "20/11/2026") return RAVENMUN_CONFERENCE.dates;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  });
  const start = formatter.format(new Date(startDateIso));
  if (!endDateIso || endDateIso === startDateIso) return start;
  return `${start} - ${formatter.format(new Date(endDateIso))}`;
}

async function getConferenceTiming() {
  try {
    const { data } = await supabase
      .from("system_settings")
      .select("event_start_date, event_end_date")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const startDateIso = data?.event_start_date ? String(data.event_start_date) : RAVENMUN_CONFERENCE.startDateIso;
    const endDateIso = data?.event_end_date ? String(data.event_end_date) : null;
    return { startDateIso, dates: data?.event_start_date ? formatConferenceDates(startDateIso, endDateIso) : RAVENMUN_CONFERENCE.dates };
  } catch {
    return { startDateIso: RAVENMUN_CONFERENCE.startDateIso, dates: RAVENMUN_CONFERENCE.dates };
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  if (typeof params.magiclink === "string") {
    redirect(`/delegations/invite?magiclink=${encodeURIComponent(params.magiclink)}`);
  }

  const session = await getServerSession(authOptions);
  if (session) {
    redirect(session.user.role === "admin" || session.user.role === "superadmin" ? "/admin" : "/dashboard");
  }

  const timing = await getConferenceTiming();

  return (
    <div className="font-[family-name:var(--font-raven-display)] raven-template-home relative h-dvh min-h-dvh w-full overflow-hidden text-white">
      <RavenHomeBackground />
      <div className="relative z-10 h-full">
        <div className="absolute inset-x-0 top-0 z-40">
          <RavenPublicNav />
        </div>

        <main className="flex h-full w-full min-w-0 flex-col items-center justify-center gap-6 px-5 py-24 text-center sm:gap-10 sm:px-8">
          <div className="w-full max-w-3xl px-1">
            <h1 className="raven-template-title raven-reveal raven-reveal-1 mb-3 text-[clamp(2.4rem,12vw,4.5rem)] font-bold leading-none sm:mb-4">
              RAVENMUN&apos;26
            </h1>
            <p className="raven-reveal raven-reveal-2 mb-2 text-lg text-white sm:text-2xl">
              {timing.dates}
            </p>
            <p className="raven-reveal raven-reveal-3 mx-auto max-w-2xl text-sm leading-6 text-white/85 sm:text-lg sm:leading-8">
              {RAVENMUN_CONFERENCE.fullName}
            </p>
          </div>

          <div className="raven-reveal raven-reveal-5 w-full min-w-0 origin-center">
            <RavenCountdown startDateIso={timing.startDateIso} />
          </div>

          <Link
            href="/apply"
            className="glassmorphism raven-reveal raven-reveal-6 group inline-flex w-full max-w-xs items-center justify-center gap-3 rounded-full px-6 py-3.5 text-lg shadow-lg transition-all duration-300 sm:w-fit sm:gap-4 sm:px-8 sm:py-4 sm:text-xl"
          >
            Apply Now
            <svg width="24" height="19" viewBox="0 0 24 19" fill="none" aria-hidden="true" className="w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-2 sm:w-6">
              <path fillRule="evenodd" clipRule="evenodd" d="M14.7105 0.439344C14.1953 1.02511 14.1953 1.97487 14.7105 2.56064L19.4951 7.99997H1.56946C0.840735 7.99997 0.25 8.67155 0.25 9.49997C0.25 10.3284 0.840735 11 1.56946 11H19.4951L14.7105 16.4392C14.1953 17.0251 14.1953 17.9749 14.7105 18.5606C15.2258 19.1465 16.0614 19.1465 16.5765 18.5606L23.6136 10.5606C24.1288 9.97473 24.1288 9.02509 23.6136 8.43932L16.5765 0.439344C16.0614 -0.146448 15.2258 -0.146448 14.7105 0.439344Z" className="fill-white transition-colors duration-300 group-hover:fill-[#C4B5FD]" />
            </svg>
          </Link>
        </main>

        <footer className="absolute inset-x-0 bottom-0 z-40 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 text-center text-sm leading-6 text-white/85">
          <p>&copy; {RAVENMUN_CONFERENCE.year} RAVENMUN, All Rights Reserved.</p>
        </footer>
      </div>
    </div>
  );
}
