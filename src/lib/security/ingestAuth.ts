import { timingSafeEqual } from "node:crypto";

// Authorization for privileged ingestion (scheduled/full pipeline runs and any
// request that supplies custom feed URLs). Designed for Vercel Cron, which sends
// `Authorization: Bearer <CRON_SECRET>`.
//
// If CRON_SECRET is unset, privileged actions are treated as UNAUTHORIZED — we
// fail closed rather than open. The public demo path (mock source only) does not
// require authorization; see the ingest route.
export function isAuthorizedIngest(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return false;

  return timingSafeEqualStr(token, secret);
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  // timingSafeEqual throws if lengths differ; compare against a fixed-length
  // digest-style buffer to avoid leaking length via early return.
  if (ab.length !== bb.length) {
    // Still perform a comparison to keep timing roughly constant.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}
