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
  title: {
    default: "The Steady One | NYC Apartment Match",
    template: "%s | The Steady One",
  },
  description:
    "Find your steady home in NYC. Know your trade-offs, decide with clarity, and move with confidence.",
  icons: {
    icon: "/brand/steady-one-black.png",
    apple: "/brand/steady-one-black.png",
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
