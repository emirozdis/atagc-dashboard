import type { Metadata } from "next";
import { Geist, Geist_Mono, Tinos } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const ravenDisplay = Tinos({ variable: "--font-raven-display", subsets: ["latin"], weight: ["400", "700"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000"),
  title: "RavenMUN 2026",
  description: "RavenMUN conference website and participant portal.",
  keywords: ["RavenMUN", "2026", "Izmir", "Model United Nations"],
  authors: [{ name: "RavenMUN" }],
  icons: { icon: "/ravenmun-logo.jpg", apple: "/ravenmun-logo.jpg" },
  openGraph: { title: "RavenMUN 2026", description: "RavenMUN conference website and participant portal.", images: ["/ravenmun-logo.jpg"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body className={`${geistSans.variable} ${geistMono.variable} ${ravenDisplay.variable} antialiased`} suppressHydrationWarning><Providers>{children}<Toaster /></Providers></body></html>;
}
