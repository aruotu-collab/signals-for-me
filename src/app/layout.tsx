import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { CookieConsent } from "@/components/CookieConsent";
import { FavouritesProvider } from "@/components/FavouritesProvider";
import { auth } from "@/auth";
import { SITE_URL } from "@/lib/site";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

const title = "SignalsForMe — Transport Job Finder";
const description =
  "Find delivery and transport jobs by swiping a service × location matrix. Nearest drop-off first, direct Shiply links.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: title,
    template: "%s · SignalsForMe",
  },
  description,
  applicationName: "SignalsForMe",
  openGraph: {
    type: "website",
    siteName: "SignalsForMe",
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const signedIn = Boolean(session?.user?.id);

  return (
    <html lang="en">
      <body>
        <FavouritesProvider signedIn={signedIn}>
          <Nav />
          <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6">{children}</main>
        </FavouritesProvider>
        <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
          <div>SignalsForMe — Transport Job Finder</div>
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
