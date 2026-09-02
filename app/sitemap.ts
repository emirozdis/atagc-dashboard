import type { MetadataRoute } from "next";
import { RAVENMUN_APPLICATION_CARDS } from "@/config/ravenmun";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();
  return [
    { url: siteUrl, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/apply`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/contact`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    ...RAVENMUN_APPLICATION_CARDS.map((card) => ({
      url: `${siteUrl}/apply/${card.type}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
