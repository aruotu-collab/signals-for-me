import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { CookieConsent } from "@/components/CookieConsent";
import { FavouritesProvider } from "@/components/FavouritesProvider";
import { DriverSettingsProvider } from "@/components/DriverSettingsProvider";
import { JsonLd } from "@/components/seo/JsonLd";
import { auth } from "@/auth";
import { SITE_URL } from "@/lib/site";
import { organizationJsonLd, SITE_KEYWORDS, websiteJsonLd } from "@/lib/seo";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const GOOGLE_VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION;

const title = "SignalsForMe — UK delivery jobs & Route Radar for drivers";
const description =
  "Find UK courier and delivery driver jobs by pickup location. Pickup Radar scans Shiply work across 60+ hubs — fuel, profit and route planning built in. eBay collection delivery quotes for buyers.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: title,
    template: "%s · SignalsForMe",
  },
  description,
  keywords: SITE_KEYWORDS,
  applicationName: "SignalsForMe",
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    siteName: "SignalsForMe",
    title,
    description,
    url: SITE_URL,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  ...(GOOGLE_VERIFICATION ? { verification: { google: GOOGLE_VERIFICATION } } : {}),
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const signedIn = Boolean(session?.user?.id);

  return (
    <html lang="en-GB">
      <body>
        <JsonLd data={[websiteJsonLd(), organizationJsonLd()]} />
        <FavouritesProvider signedIn={signedIn}>
          <DriverSettingsProvider signedIn={signedIn}>
            <Nav />
            <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6">{children}</main>
          </DriverSettingsProvider>
        </FavouritesProvider>
        <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
          <div>SignalsForMe — UK delivery jobs &amp; Route Radar for drivers</div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
            <a href="/jobs" className="text-slate-400 underline hover:text-slate-200">
              Jobs by area
            </a>
            <a href="/delivery-jobs" className="text-slate-400 underline hover:text-slate-200">
              Jobs by type
            </a>
            <a href="/matrix" className="text-slate-400 underline hover:text-slate-200">
              Pickup Radar
            </a>
            <a href="/quotes" className="text-slate-400 underline hover:text-slate-200">
              eBay delivery quotes
            </a>
          </div>
          <div className="mt-2 flex items-center justify-center gap-3">
            <a href="/privacy" className="text-slate-400 underline hover:text-slate-200">
              Privacy Policy
            </a>
            <a href="/legacy" className="text-slate-400 underline hover:text-slate-200">
              Legacy
            </a>
          </div>
        </footer>
        {GA_ID ? <CookieConsent gaId={GA_ID} /> : null}
      </body>
    </html>
  );
}
