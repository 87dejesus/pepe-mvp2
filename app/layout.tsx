import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
  icons: {
    icon: "/brand/steady-one-black.png",
    apple: "/brand/steady-one-black.png",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <GoogleAnalytics gaId="G-0LQ1VL0PMG" />
      </body>
    </html>
  );
}