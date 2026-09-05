export const RAVENMUN_OG_IMAGE = {
  path: "/ravenmun-og-optimized.jpg",
  width: 640,
  height: 640,
  alt: "RAVENMUN'26 logo",
} as const;

export const RAVENMUN_META_DESCRIPTION = "Raven Model United Nations Conference. Join us on 20-21-22 November 2026.";
export const RAVENMUN_OG_DESCRIPTION = "20-21-22 November 2026 | Raven Model United Nations Conference.";
export const RAVENMUN_APPLY_DESCRIPTION = "Apply to be a part of RAVENMUN'26.";

export function getRavenmunOgImageUrl(siteUrl: string) {
  return new URL(RAVENMUN_OG_IMAGE.path, `${siteUrl}/`).toString();
}
