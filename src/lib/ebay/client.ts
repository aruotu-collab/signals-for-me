import { ebayAffiliateEndUserCtx } from "@/lib/ebay/affiliate";

const BROWSE_SCOPES = "https://api.ebay.com/oauth/api_scope";

let cachedToken: { token: string; expiresAt: number } | null = null;

export function isEbayApiConfigured(): boolean {
  return Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
}

export function ebayApiBase(): string {
  return process.env.EBAY_ENV === "sandbox" ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";
}

export async function getEbayAccessToken(): Promise<string> {
  if (!isEbayApiConfigured()) throw new Error("eBay API credentials are not configured.");

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const clientId = process.env.EBAY_CLIENT_ID!;
  const clientSecret = process.env.EBAY_CLIENT_SECRET!;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${ebayApiBase()}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: BROWSE_SCOPES,
    }),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
    error?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? `eBay OAuth failed (${res.status})`);
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 7200) * 1000,
  };

  return cachedToken.token;
}

export async function ebayBrowse<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getEbayAccessToken();
  const affiliateCtx = ebayAffiliateEndUserCtx();
  const res = await fetch(`${ebayApiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_GB",
      ...(affiliateCtx ? { "X-EBAY-C-ENDUSERCTX": affiliateCtx } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as T & { errors?: { message?: string }[] };
  if (!res.ok) {
    const msg = data.errors?.[0]?.message ?? `eBay API error (${res.status})`;
    throw new Error(msg);
  }
  return data;
}
