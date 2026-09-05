import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Tinos } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import { getSiteUrl } from "@/lib/site-url";
import RavenStructuredData from "@/components/raven/RavenStructuredData";
import { getRavenmunOgImageUrl, RAVENMUN_META_DESCRIPTION, RAVENMUN_OG_DESCRIPTION, RAVENMUN_OG_IMAGE } from "@/lib/raven-metadata";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], preload: false });
const ravenDisplay = Tinos({ variable: "--font-raven-display", subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const siteUrl = getSiteUrl();
const ogImageUrl = getRavenmunOgImageUrl(siteUrl);

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "RAVENMUN'26",
    template: "%s | RAVENMUN'26",
  },
  description: RAVENMUN_META_DESCRIPTION,
  keywords: [
    "RavenMUN",
    "RAVENMUN'26",
    "RavenMUN 2026",
    "Model United Nations",
    "MUN İzmir",
    "MUN Türkiye",
    "delegate application",
    "chairboard application",
    "delegation application",
  ],
  applicationName: "RAVENMUN'26",
  authors: [{ name: "RavenMUN Organizing Committee" }],
  creator: "RavenMUN Organizing Committee",
  publisher: "RavenMUN",
  category: "education",
  referrer: "origin-when-cross-origin",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, nocache: false, googleBot: { index: true, follow: true, noimageindex: false } },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/ravenmun-og.jpg", type: "image/jpeg", sizes: "640x640" },
    ],
    shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/ravenmun-og.jpg", type: "image/jpeg", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "RAVENMUN'26",
    title: "RAVENMUN'26 | Raven Model United Nations Conference",
    description: RAVENMUN_OG_DESCRIPTION,
    images: [{ url: ogImageUrl, width: RAVENMUN_OG_IMAGE.width, height: RAVENMUN_OG_IMAGE.height, alt: RAVENMUN_OG_IMAGE.alt }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RAVENMUN'26 | Raven Model United Nations Conference",
    description: RAVENMUN_OG_DESCRIPTION,
    images: [ogImageUrl],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#08070D",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" translate="no" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${ravenDisplay.variable} overflow-x-hidden antialiased`} suppressHydrationWarning>
        <Providers><RavenStructuredData />{children}<Toaster /></Providers>
      </body>
    </html>
  );
}
