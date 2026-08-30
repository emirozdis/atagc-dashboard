import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { Tinos } from "next/font/google";
import RavenCountdown from "@/components/raven/RavenCountdown";
import RavenHomeBackground from "@/components/raven/RavenHomeBackground";
import RavenPublicNav from "@/components/raven/RavenPublicNav";
import { RAVENMUN_CONFERENCE } from "@/config/ravenmun";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/SERVER_supabase";

const tinos = Tinos({ subsets: ["latin"], weight: ["400", "700"], display: "swap" });

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
    <div className={`${tinos.className} raven-template-home relative min-h-screen w-screen max-w-[100vw] overflow-x-hidden text-white lg:h-dvh lg:overflow-hidden`}>
      <RavenHomeBackground />
      <div className="relative z-10 flex min-h-screen flex-col lg:h-full lg:min-h-0">
        <RavenPublicNav />

        <main className="flex w-full min-w-0 max-w-full flex-1 flex-col items-center justify-center gap-10 px-4 py-12 text-center max-sm:gap-8 max-sm:py-8 lg:min-h-0">
          <div>
            <h1 className="raven-template-title raven-reveal raven-reveal-1 mb-4 whitespace-nowrap text-7xl font-bold max-sm:text-[36px]">
              RAVENMUN&apos;26
            </h1>
            <p className="raven-reveal raven-reveal-2 mb-2 text-2xl text-white max-sm:text-lg">
              {timing.dates}
            </p>
            <p className="raven-reveal raven-reveal-3 mx-auto max-w-2xl text-lg text-white/85 max-sm:text-sm">
              {RAVENMUN_CONFERENCE.fullName}
            </p>
          </div>

          <div className="raven-reveal raven-reveal-5 w-full origin-center">
            <RavenCountdown startDateIso={timing.startDateIso} />
          </div>

          <Link
            href="/apply"
            className="glassmorphism raven-reveal raven-reveal-6 group inline-flex w-fit items-center justify-center gap-4 rounded-full px-8 py-4 text-xl shadow-lg transition-all duration-300 max-sm:gap-2 max-sm:px-6 max-sm:py-3 max-sm:text-base"
          >
            Apply Now
            <svg width="24" height="19" viewBox="0 0 24 19" fill="none" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-2 max-sm:w-[15px]">
              <path fillRule="evenodd" clipRule="evenodd" d="M14.7105 0.439344C14.1953 1.02511 14.1953 1.97487 14.7105 2.56064L19.4951 7.99997H1.56946C0.840735 7.99997 0.25 8.67155 0.25 9.49997C0.25 10.3284 0.840735 11 1.56946 11H19.4951L14.7105 16.4392C14.1953 17.0251 14.1953 17.9749 14.7105 18.5606C15.2258 19.1465 16.0614 19.1465 16.5765 18.5606L23.6136 10.5606C24.1288 9.97473 24.1288 9.02509 23.6136 8.43932L16.5765 0.439344C16.0614 -0.146448 15.2258 -0.146448 14.7105 0.439344Z" className="fill-white transition-colors duration-300 group-hover:fill-[#C4B5FD]" />
            </svg>
          </Link>
        </main>

        <footer className="shrink-0 px-4 pb-6 text-center text-white">
          <p>&copy; {RAVENMUN_CONFERENCE.year} RAVENMUN, All Rights Reserved.</p>
        </footer>
      </div>
    </div>
  );
}
