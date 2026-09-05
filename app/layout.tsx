import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Tinos } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import { getSiteUrl } from "@/lib/site-url";
import RavenStructuredData from "@/components/raven/RavenStructuredData";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], preload: false });
const ravenDisplay = Tinos({ variable: "--font-raven-display", subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "RAVENMUN'26",
    template: "%s | RAVENMUN'26",
  },
  description: "RAVENMUN'26 is a Model United Nations conference in İzmir, Türkiye, held on 20-22 November 2026. Apply as a delegate, chairboard member, press photographer, administrative staff member, or delegation.",
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
      { url: "/ravenmun-logo.jpg", type: "image/jpeg", sizes: "100x100" },
    ],
    shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/ravenmun-logo.jpg", type: "image/jpeg", sizes: "100x100" }],
  },
  openGraph: {
    type: "website",
    locale: "en_TR",
    url: siteUrl,
    siteName: "RAVENMUN'26",
    title: "RAVENMUN'26 | Raven Model United Nations Conference",
    description: "Join RavenMUN in İzmir, Türkiye, from 20-22 November 2026.",
    images: [{ url: "/raven-hero.webp", width: 1536, height: 1024, alt: "A raven flying across a purple night sky" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RAVENMUN'26 | Raven Model United Nations Conference",
    description: "Join RavenMUN in İzmir, Türkiye, from 20-22 November 2026.",
    images: ["/raven-hero.webp"],
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
