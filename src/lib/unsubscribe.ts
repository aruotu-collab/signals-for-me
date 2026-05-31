import { createHmac, timingSafeEqual } from "node:crypto";
import { SITE_URL } from "@/lib/site";

// Stateless, tamper-proof unsubscribe links: the token is an HMAC of the user id
// keyed by a server secret. No token table needed — we just recompute and
// compare. Reuses AUTH_SECRET (always set in prod) unless UNSUBSCRIBE_SECRET is
// provided explicitly.
function secret(): string {
  return (
    process.env.UNSUBSCRIBE_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.CRON_SECRET ||
    "dev-unsubscribe-secret"
  );
}

export function unsubscribeToken(userId: string): string {
  return createHmac("sha256", secret()).update(userId).digest("hex");
}

export function verifyUnsubscribe(userId: string, token: string): boolean {
  if (!userId || !token) return false;
  const expected = unsubscribeToken(userId);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function unsubscribeUrl(userId: string): string {
  const t = unsubscribeToken(userId);
  return `${SITE_URL}/api/unsubscribe?u=${encodeURIComponent(userId)}&t=${t}`;
}
