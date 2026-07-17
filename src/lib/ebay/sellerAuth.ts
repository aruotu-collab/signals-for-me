import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { ebayApiBase, isEbayApiConfigured } from "@/lib/ebay/client";

export const EBAY_SELL_SCOPES = [
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.account",
].join(" ");

function authBase(): string {
  return process.env.EBAY_ENV === "sandbox" ? "https://auth.sandbox.ebay.com" : "https://auth.ebay.com";
}

export function ebayRedirectUri(): string {
  return (
    process.env.EBAY_REDIRECT_URI?.trim() ||
    `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000"}/api/ebay/oauth/callback`
  );
}

function stateSecret(): string {
  return process.env.AUTH_SECRET || process.env.EBAY_CLIENT_SECRET || "sfm-ebay-oauth";
}

export function createOAuthState(userId: string): string {
  const nonce = `${Date.now()}.${Math.random().toString(36).slice(2)}`;
  const payload = `${userId}:${nonce}`;
  const sig = createHmac("sha256", stateSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function parseOAuthState(state: string): string | null {
  try {
    const raw = Buffer.from(state, "base64url").toString("utf8");
    const parts = raw.split(":");
    if (parts.length < 3) return null;
    const sig = parts.pop()!;
    const payload = parts.join(":");
    const expected = createHmac("sha256", stateSecret()).update(payload).digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const userId = parts[0];
    const ts = Number(parts[1]?.split(".")[0]);
    if (!userId || !Number.isFinite(ts)) return null;
    // 30 minute window
    if (Date.now() - ts > 30 * 60_000) return null;
    return userId;
  } catch {
    return null;
  }
}

export function buildSellerAuthorizeUrl(userId: string): string {
  if (!isEbayApiConfigured()) throw new Error("eBay API credentials are not configured.");
  const params = new URLSearchParams({
    client_id: process.env.EBAY_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.EBAY_RU_NAME?.trim() || ebayRedirectUri(),
    scope: EBAY_SELL_SCOPES,
    state: createOAuthState(userId),
  });
  return `${authBase()}/oauth2/authorize?${params}`;
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
};

async function tokenRequest(body: URLSearchParams): Promise<TokenResponse> {
  const clientId = process.env.EBAY_CLIENT_ID!;
  const clientSecret = process.env.EBAY_CLIENT_SECRET!;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${ebayApiBase()}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? `eBay token exchange failed (${res.status})`);
  }
  return data;
}

export async function exchangeAuthorizationCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: string;
}> {
  const data = await tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.EBAY_RU_NAME?.trim() || ebayRedirectUri(),
    }),
  );
  if (!data.refresh_token) throw new Error("eBay did not return a refresh token.");
  return {
    accessToken: data.access_token!,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 7200) * 1000),
    scopes: EBAY_SELL_SCOPES,
  };
}

export async function refreshSellerAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const data = await tokenRequest(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: EBAY_SELL_SCOPES,
    }),
  );
  return {
    accessToken: data.access_token!,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 7200) * 1000),
  };
}

export async function upsertSellerConnection(
  userId: string,
  tokens: { accessToken: string; refreshToken: string; expiresAt: Date; scopes: string },
  ebayUserId?: string | null,
) {
  return prisma.ebaySellerConnection.upsert({
    where: { userId },
    create: {
      userId,
      ebayUserId: ebayUserId ?? null,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scopes: tokens.scopes,
    },
    update: {
      ebayUserId: ebayUserId ?? undefined,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scopes: tokens.scopes,
    },
  });
}

export async function getSellerConnection(userId: string) {
  return prisma.ebaySellerConnection.findUnique({ where: { userId } });
}

export async function deleteSellerConnection(userId: string) {
  await prisma.ebaySellerConnection.deleteMany({ where: { userId } });
}

/** Returns a valid user access token, refreshing if needed. */
export async function getValidSellerAccessToken(userId: string): Promise<string> {
  const conn = await getSellerConnection(userId);
  if (!conn) throw new Error("eBay seller account is not connected.");

  if (conn.expiresAt.getTime() > Date.now() + 60_000) {
    return conn.accessToken;
  }

  const refreshed = await refreshSellerAccessToken(conn.refreshToken);
  await upsertSellerConnection(userId, {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    expiresAt: refreshed.expiresAt,
    scopes: conn.scopes,
  });
  return refreshed.accessToken;
}

export async function ebaySellFetch<T>(
  userId: string,
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: T }> {
  const token = await getValidSellerAccessToken(userId);
  const res = await fetch(`${ebayApiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Content-Language": "en-GB",
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_GB",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  let data = {} as T;
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = { message: text } as T;
    }
  }
  return { ok: res.ok, status: res.status, data };
}
