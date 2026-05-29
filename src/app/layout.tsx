import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Signals For Me — Opportunity Intelligence Platform",
  description:
    "AI scans the internet, detects important signals, and delivers personalized opportunities before they become obvious.",
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
    </html>
  );
}
