// Canonical public base URL, used for metadata, OG tags, sitemap and robots.
// Override via NEXT_PUBLIC_SITE_URL in the environment (e.g. a custom domain).
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "https://signals-for-me.vercel.app"
).replace(/\/$/, "");
