export const RAVENMUN_THEME = {
  background: "#08070D",
  surface: "#12101A",
  surfaceElevated: "#1B1727",
  primary: "#7C3AED",
  primaryDeep: "#4C1D95",
  lilac: "#C4B5FD",
  silver: "#C3C7D1",
  foreground: "#F5F3FF",
  muted: "#9CA3AF",
  success: "#86EFAC",
  warning: "#FDE68A",
  danger: "#FDA4AF",
} as const;

export const RAVENMUN_CONFERENCE = {
  id: "ravenmun",
  name: "RavenMUN",
  displayName: "RAVENMUN'26",
  fullName: "Raven Model United Nations Conference",
  dates: "20-21-22 November",
  startDateIso: "2026-11-20T00:00:00+03:00" as string | null,
  year: 2026,
  city: "\u0130zmir",
  country: "T\u00fcrkiye",
  venue: "Narlıdere Uğur Okulları Kampüsü",
  email: "ravenmun26@gmail.com",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "https://ravenmun.org").replace(/\/$/, ""),
  instagramHandle: "@ravenmun26",
  instagramUrl: "https://www.instagram.com/ravenmun26/",
  sessionDurationDays: 365,
} as const;

export const RAVENMUN_APPLICATION_CARDS = [
  {
    type: "delegate",
    title: "Delegate",
    description: "Represent a country, research global issues, and negotiate meaningful solutions.",
    icon: "user",
  },
  {
    type: "chairboard",
    title: "Chairboard",
    description: "Lead a committee, guide procedure, and create a productive debate environment.",
    icon: "star",
  },
  {
    type: "delegation",
    title: "Delegation",
    description: "Bring your school or organization to RavenMUN and coordinate its participants.",
    icon: "users",
  },
  {
    type: "press",
    title: "Press",
    description: "Capture the conference, document its most important moments, and preserve the experience through photography.",
    icon: "camera",
  },
  {
    type: "observer",
    title: "Administrative Staff",
    description: "Support conference operations, assist the organisation team, and help participants on site.",
    icon: "eye",
  },
] as const;

export type RavenApplicationType = (typeof RAVENMUN_APPLICATION_CARDS)[number]["type"];
