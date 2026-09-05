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
      { src: "/favicon.ico", sizes: "64x64", type: "image/x-icon", purpose: "any" },
      { src: "/icon.png", sizes: "640x640", type: "image/png", purpose: "any" },
    ],
  };
}
