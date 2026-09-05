import { RAVENMUN_CONFERENCE } from "@/config/ravenmun";
import { getSiteUrl } from "@/lib/site-url";

export default function RavenStructuredData() {
  const siteUrl = getSiteUrl();
  const event = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: RAVENMUN_CONFERENCE.fullName,
    alternateName: RAVENMUN_CONFERENCE.displayName,
    description: "A Model United Nations conference in İzmir, Türkiye, bringing students together for research, debate, and diplomacy.",
    url: siteUrl,
    image: [`${siteUrl}/raven-hero.webp`],
    startDate: RAVENMUN_CONFERENCE.startDateIso,
    endDate: RAVENMUN_CONFERENCE.endDateIso,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: RAVENMUN_CONFERENCE.venue,
      address: {
        "@type": "PostalAddress",
        addressLocality: RAVENMUN_CONFERENCE.city,
        addressCountry: "TR",
      },
    },
    organizer: {
      "@type": "Organization",
      name: "RavenMUN Organizing Committee",
      url: siteUrl,
      email: RAVENMUN_CONFERENCE.email,
    },
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(event).replace(/</g, "\\u003c") }} />;
}
