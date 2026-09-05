export const RAVENMUN_OG_IMAGE = {
  path: "/raven-hero.webp",
  width: 1536,
  height: 1024,
  alt: "A raven flying across a purple night sky",
} as const;

export function getRavenmunOgImageUrl(siteUrl: string) {
  return new URL(RAVENMUN_OG_IMAGE.path, `${siteUrl}/`).toString();
}
