import type { Metadata, Viewport } from "next";
import { Inter, Libre_Caslon_Display } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/next";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import FunnelInit from "@/components/FunnelInit";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// Editorial serif for headlines and verdicts (the "NYC broadsheet" voice).
// UI and body stay on Inter.
const caslon = Libre_Caslon_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-caslon",
  display: "swap",
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
  metadataBase: new URL("https://www.thesteadyone.com"),
  title: {
    default: "The Steady One | NYC Apartment Match",
    template: "%s | The Steady One",
  },
  description:
    "Find your steady home in NYC. Answer 7 questions, get matched with listings, and decide with clarity, not panic.",
  keywords: ["NYC apartments", "apartment search", "NYC rentals", "apartment matcher", "The Steady One"],
  authors: [{ name: "The Steady One" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.thesteadyone.com",
    siteName: "The Steady One",
    title: "The Steady One | NYC Apartment Match",
    description:
      "Find your steady home in NYC. Answer 7 questions, get matched with listings, and decide with clarity, not panic.",
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
      "Find your steady home in NYC. Answer 7 questions, get matched with listings, and decide with clarity, not panic.",
    images: ["/brand/steady-one-blue.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "The Steady One",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/brand/steady-one-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/steady-one-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/brand/steady-one-192.png",
    apple: [
      { url: "/brand/steady-one-180.png", sizes: "180x180", type: "image/png" },
      { url: "/brand/steady-one-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  other: {
    "impact-site-verification": "7f1ba217-a484-4912-a99b-6f0b086341a6",
    "fo-verify": "a6129b2c-0a28-4ae6-ad4b-46ad71ff15fd",
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'The Steady One',
  alternateName: 'Steady One',
  url: 'https://www.thesteadyone.com',
  logo: 'https://www.thesteadyone.com/brand/steady-one-512.png',
  description:
    'NYC apartment match platform. Answer 7 questions, get matched listings, decide with clarity.',
  areaServed: {
    '@type': 'City',
    name: 'New York City',
  },
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'The Steady One',
  url: 'https://www.thesteadyone.com',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${caslon.variable} font-[family-name:var(--font-inter)] antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {children}
        <FunnelInit />
        <ServiceWorkerRegistration />
        <GoogleAnalytics gaId="G-0LQ1VL0PMG" />
        {/* Vercel Web Analytics: pageviews + referrers readable in the Vercel
            dashboard (founder-accessible, unlike the orphaned GA property). */}
        <Analytics />
      </body>
    </html>
  );
}