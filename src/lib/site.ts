// Canonical public base URL, used for metadata, OG tags, sitemap and robots.
// Must match your Google Search Console property exactly (www vs non-www).
// Production: set NEXT_PUBLIC_SITE_URL=https://signalsforme.com in Vercel.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "https://signalsforme.com"
).replace(/\/$/, "");
