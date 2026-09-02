import type { Metadata } from "next";
import { Geist, Geist_Mono, Tinos } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import { getSiteUrl } from "@/lib/site-url";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], preload: false });
const ravenDisplay = Tinos({ variable: "--font-raven-display", subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "RavenMUN 2026",
    template: "%s | RavenMUN 2026",
  },
  description: "Raven Model United Nations Conference 2026 in Izmir, Türkiye. Apply as a delegate, chairboard member, press, observer, or delegation.",
  keywords: ["RavenMUN", "2026", "Izmir", "Model United Nations"],
  authors: [{ name: "RavenMUN" }],
  robots: { index: true, follow: true },
  icons: { icon: "/ravenmun-logo.jpg", apple: "/ravenmun-logo.jpg" },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: siteUrl,
    siteName: "RavenMUN 2026",
    title: "RavenMUN 2026",
    description: "Raven Model United Nations Conference 2026 in Izmir, Türkiye.",
    images: ["/ravenmun-logo.jpg"],
  },
  twitter: {
    card: "summary",
    title: "RavenMUN 2026",
    description: "Raven Model United Nations Conference 2026 in Izmir, Türkiye.",
    images: ["/ravenmun-logo.jpg"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" translate="no" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${ravenDisplay.variable} overflow-x-hidden antialiased`} suppressHydrationWarning>
        <Providers>{children}<Toaster /></Providers>
      </body>
    </html>
  );
}
