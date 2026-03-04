import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#00A651',
};

export const metadata: Metadata = {
  metadataBase: new URL("https://thesteadyone.com"),
  title: {
    default: "The Steady One | NYC Apartment Match",
    template: "%s | The Steady One",
  },
  description:
    "Find your steady home in NYC. Answer 7 questions, get matched with listings, and decide with clarity — not panic.",
  keywords: ["NYC apartments", "apartment search", "NYC rentals", "apartment matcher", "The Steady One"],
  authors: [{ name: "The Steady One" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://thesteadyone.com",
    siteName: "The Steady One",
    title: "The Steady One | NYC Apartment Match",
    description:
      "Find your steady home in NYC. Answer 7 questions, get matched with listings, and decide with clarity — not panic.",
    images: [
      {
        url: "/brand/steady-one-blue.png",
        width: 512,
        height: 512,
        alt: "The Steady One logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "The Steady One | NYC Apartment Match",
    description:
      "Find your steady home in NYC. Answer 7 questions, get matched with listings, and decide with clarity — not panic.",
    images: ["/brand/steady-one-blue.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "The Steady One",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/brand/icon-192x192.png",
    shortcut: "/brand/icon-192x192.png",
    apple: [
      { url: "/brand/steady-one-192.png" },
      { url: "/brand/steady-one-180.png", sizes: "180x180" },
    ],
  },
  other: {
    "impact-site-verification": "7f1ba217-a484-4912-a99b-6f0b086341a6",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-[family-name:var(--font-inter)] antialiased`}
      >
        {children}
        <ServiceWorkerRegistration />
        <GoogleAnalytics gaId="G-0LQ1VL0PMG" />
      </body>
    </html>
  );
}