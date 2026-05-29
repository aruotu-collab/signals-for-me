import { lookup } from "node:dns/promises";
import net from "node:net";

// Raised when a URL is rejected by the SSRF guard. The route maps this to a 400.
export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Validate a URL before the server is allowed to fetch it (SSRF defense).
 *
 * Checks, in order:
 *  1. Parseable URL using http(s) only.
 *  2. Optional hostname allowlist via FEED_URL_ALLOWLIST (comma-separated).
 *  3. Resolves the host (DNS) and rejects any private / loopback / link-local /
 *     metadata IP — this blocks access to internal services and cloud metadata
 *     endpoints (e.g. 169.254.169.254).
 *
 * Returns the normalized URL string. Throws UnsafeUrlError on rejection.
 *
 * Residual risk: DNS rebinding between this check and the actual fetch is not
 * fully eliminated without a pinned-IP HTTP agent — tracked as a follow-up.
 */
export async function assertSafeFeedUrl(raw: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError(`Invalid URL: ${raw}`);
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new UnsafeUrlError(`Only http(s) URLs are allowed (got ${url.protocol})`);
  }

  const host = url.hostname.toLowerCase();

  const allowlist = (process.env.FEED_URL_ALLOWLIST ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length > 0) {
    const ok = allowlist.some((h) => host === h || host.endsWith(`.${h}`));
    if (!ok) {
      throw new UnsafeUrlError(`Host not in FEED_URL_ALLOWLIST: ${host}`);
    }
  }

  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new UnsafeUrlError(`Refusing to fetch internal host: ${host}`);
  }

  const addresses = net.isIP(host)
    ? [host]
    : (await lookup(host, { all: true })).map((a) => a.address);

  if (addresses.length === 0) {
    throw new UnsafeUrlError(`Could not resolve host: ${host}`);
  }

  for (const addr of addresses) {
    if (isPrivateAddress(addr)) {
      throw new UnsafeUrlError(`Refusing to fetch private/internal address: ${addr}`);
    }
  }

  return url.toString();
}

function isPrivateAddress(addr: string): boolean {
  const version = net.isIP(addr);
  if (version === 4) return isPrivateIPv4(addr);
  if (version === 6) return isPrivateIPv6(addr);
  return true; // unknown format → treat as unsafe
}

function isPrivateIPv4(addr: string): boolean {
  const parts = addr.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 169 && b === 254) return true; // link-local (incl. cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  return false;
}

function isPrivateIPv6(addr: string): boolean {
  const a = addr.toLowerCase();
  if (a === "::1" || a === "::") return true; // loopback / unspecified
  if (a.startsWith("fe80")) return true; // link-local
  if (a.startsWith("fc") || a.startsWith("fd")) return true; // unique local fc00::/7
  // IPv4-mapped IPv6, e.g. ::ffff:127.0.0.1
  const mapped = a.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}
