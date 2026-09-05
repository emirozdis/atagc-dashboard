import { RAVENMUN_CONFERENCE } from "@/config/ravenmun";
import { getSiteUrl } from "@/lib/site-url";
import { RAVENMUN_META_DESCRIPTION, RAVENMUN_OG_IMAGE } from "@/lib/raven-metadata";

export default function RavenStructuredData() {
  const siteUrl = getSiteUrl();
  const event = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: RAVENMUN_CONFERENCE.fullName,
    alternateName: RAVENMUN_CONFERENCE.displayName,
    description: RAVENMUN_META_DESCRIPTION,
    url: siteUrl,
    image: [`${siteUrl}${RAVENMUN_OG_IMAGE.path}`],
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
