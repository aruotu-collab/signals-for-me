import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { SITE_URL } from "@/lib/site";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

const title = "Signals For Me — Opportunity Intelligence Platform";
const description =
  "AI scans the internet, detects important signals, and delivers personalized opportunities before they become obvious.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: title,
    template: "%s · Signals For Me",
  },
  description,
  applicationName: "Signals For Me",
  openGraph: {
    type: "website",
    siteName: "Signals For Me",
    title,
    description,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6">{children}</main>
        <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
          Signals For Me — Opportunity Intelligence Platform · Demo build
        </footer>
      </body>
      {GA_ID ? <GoogleAnalytics gaId={GA_ID} /> : null}
    </html>
  );
}
