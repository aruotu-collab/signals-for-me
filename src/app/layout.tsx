import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { CookieConsent } from "@/components/CookieConsent";
import { FavouritesProvider } from "@/components/FavouritesProvider";
import { FlipDeskProvider } from "@/components/FlipDeskProvider";
import { DriverSettingsProvider } from "@/components/DriverSettingsProvider";
import { JsonLd } from "@/components/seo/JsonLd";
import { auth } from "@/auth";
import { SITE_URL } from "@/lib/site";
import { organizationJsonLd, SITE_KEYWORDS, websiteJsonLd } from "@/lib/seo";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const GOOGLE_VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION;

const title = "SignalsForMe — Flip Radar for UK eBay auction profits";
const description =
  "Scan UK eBay auctions ending soon. Set your profit target for watches, phones and laptops — see buy price, market value, fees, net profit and max bid.";

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
          <FlipDeskProvider>
            <DriverSettingsProvider signedIn={signedIn}>
              <Nav />
              <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6">{children}</main>
            </DriverSettingsProvider>
          </FlipDeskProvider>
        </FavouritesProvider>
        <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
          <div>SignalsForMe — Flip Radar for UK eBay auction profits</div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
            <a href="/flip/desk" className="text-slate-400 underline hover:text-slate-200">
              My Desk
            </a>
            <a href="/source" className="text-slate-400 underline hover:text-slate-200">
              List Today
            </a>
            <a href="/flip" className="text-slate-400 underline hover:text-slate-200">
              Flip Radar
            </a>
            <a href="/flip?category=Watches" className="text-slate-400 underline hover:text-slate-200">
              Watches
            </a>
            <a href="/flip?category=Phones" className="text-slate-400 underline hover:text-slate-200">
              Phones
            </a>
            <a href="/flip?category=Laptops" className="text-slate-400 underline hover:text-slate-200">
              Laptops
            </a>
          </div>
          <div className="mt-2 flex items-center justify-center gap-3">
            <a href="/privacy" className="text-slate-400 underline hover:text-slate-200">
              Privacy Policy
            </a>
            <a href="/legacy" className="text-slate-400 underline hover:text-slate-200">
              Legacy tools
            </a>
          </div>
        </footer>
        {GA_ID ? <CookieConsent gaId={GA_ID} /> : null}
      </body>
    </html>
  );
}
