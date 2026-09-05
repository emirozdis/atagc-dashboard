import type { MetadataRoute } from "next";
import { RAVENMUN_CONFERENCE } from "@/config/ravenmun";
import { getSiteUrl } from "@/lib/site-url";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: RAVENMUN_CONFERENCE.fullName,
    short_name: RAVENMUN_CONFERENCE.displayName,
    description: "RavenMUN 2026 conference information, applications, and participant services.",
    start_url: getSiteUrl(),
    display: "standalone",
    background_color: "#08070D",
    theme_color: "#08070D",
    lang: "en",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/ravenmun-logo.jpg", sizes: "640x640", type: "image/jpeg", purpose: "any" },
    ],
  };
}
