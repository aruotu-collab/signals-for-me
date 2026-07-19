const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

type CjTokenData = {
  accessToken?: string;
  accessTokenExpiryDate?: string;
  refreshToken?: string;
  refreshTokenExpiryDate?: string;
};

type CjEnvelope<T> = {
  code?: number;
  result?: boolean;
  success?: boolean;
  message?: string;
  data?: T;
};

export type CjProduct = {
  id: string;
  name: string;
  sku: string;
  imageUrl: string | null;
  sellPriceUsd: number;
  listedNum: number | null;
  categoryName: string | null;
  warehouse: string | null;
  weightGrams: number | null;
  productUrl: string | null;
};

let cachedToken: { token: string; expiresAt: number; refreshToken?: string } | null = null;

export function isCjConfigured(): boolean {
  return Boolean(process.env.CJ_API_KEY?.trim());
}

function parseExpiry(iso?: string): number {
  if (!iso) return Date.now() + 14 * 24 * 60 * 60 * 1000;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : Date.now() + 14 * 24 * 60 * 60 * 1000;
}

async function getAccessToken(): Promise<string> {
  if (!isCjConfigured()) throw new Error("CJ Dropshipping API key is not configured.");
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  if (cachedToken?.refreshToken) {
    try {
      const refreshed = await cjPost<CjTokenData>("/authentication/refreshAccessToken", {
        refreshToken: cachedToken.refreshToken,
      }, false);
      if (refreshed.accessToken) {
        cachedToken = {
          token: refreshed.accessToken,
          expiresAt: parseExpiry(refreshed.accessTokenExpiryDate),
          refreshToken: refreshed.refreshToken ?? cachedToken.refreshToken,
        };
        return cachedToken.token;
      }
    } catch {
      // fall through to full login
    }
  }

  const data = await cjPost<CjTokenData>(
    "/authentication/getAccessToken",
    { apiKey: process.env.CJ_API_KEY!.trim() },
    false,
  );
  if (!data.accessToken) throw new Error("CJ did not return an access token.");
  cachedToken = {
    token: data.accessToken,
    expiresAt: parseExpiry(data.accessTokenExpiryDate),
    refreshToken: data.refreshToken,
  };
  return cachedToken.token;
}

async function cjPost<T>(path: string, body: unknown, auth = true): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) headers["CJ-Access-Token"] = await getAccessToken();
  const res = await fetch(`${CJ_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as CjEnvelope<T>;
  if (!res.ok || json.code !== 200) {
    throw new Error(json.message ?? `CJ API error (${res.status})`);
  }
  return (json.data ?? {}) as T;
}

async function cjGet<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === "") continue;
    qs.set(k, String(v));
  }
  const token = await getAccessToken();
  const res = await fetch(`${CJ_BASE}${path}?${qs}`, {
    method: "GET",
    headers: { "CJ-Access-Token": token },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as CjEnvelope<T>;
  if (!res.ok || (json.code != null && json.code !== 200)) {
    throw new Error(json.message ?? `CJ API error (${res.status})`);
  }
  return (json.data ?? {}) as T;
}

type CjListItem = {
  pid?: string;
  id?: string;
  productId?: string;
  nameEn?: string;
  productNameEn?: string;
  productName?: string;
  sku?: string;
  productSku?: string;
  spu?: string;
  bigImage?: string;
  productImage?: string;
  sellPrice?: string | number;
  nowPrice?: string | number;
  listedNum?: number;
  categoryName?: string;
  threeCategoryName?: string;
  defaultArea?: string;
  weight?: string | number;
  productWeight?: string | number;
  productUrl?: string;
  trialFreight?: string | number;
  saleStatus?: string | number;
  warehouseInventoryNum?: number;
  totalVerifiedInventory?: number;
};

type CjListBlock = CjListItem & {
  productList?: CjListItem[];
};

type CjListData = {
  list?: CjListItem[];
  content?: CjListBlock[];
  totalRecords?: number;
  total?: number;
};

function toNumber(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/** CJ catalog pages use `{slug}-p-{numericId}.html`; API IDs are often UUIDs — SKU search is the reliable open link. */
function slugifyCjName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "product";
}

export function buildCjProductUrl(input: {
  productUrl?: string | null;
  id: string;
  sku: string;
  name: string;
}): string {
  const fromApi = input.productUrl?.trim();
  if (fromApi && /cjdropshipping\.com/i.test(fromApi) && !/\/product\/\d+$/i.test(fromApi)) {
    return fromApi;
  }

  const sku = input.sku.trim();
  if (sku && !/^https?:/i.test(sku)) {
    return `https://cjdropshipping.com/search.html?from=all&keyWord=${encodeURIComponent(sku)}`;
  }

  // Numeric snowflake IDs can use the public catalog path.
  if (/^\d{12,}$/.test(input.id)) {
    return `https://cjdropshipping.com/product/${slugifyCjName(input.name)}-p-${input.id}.html`;
  }

  const q = input.name.trim().slice(0, 60);
  return `https://cjdropshipping.com/search.html?from=all&keyWord=${encodeURIComponent(q || input.id)}`;
}

function extractListItems(data: CjListData): CjListItem[] {
  if (Array.isArray(data.list) && data.list.length > 0) return data.list;

  const out: CjListItem[] = [];
  for (const block of data.content ?? []) {
    if (Array.isArray(block.productList) && block.productList.length > 0) {
      out.push(...block.productList);
      continue;
    }
    if (block.nameEn || block.productNameEn || block.productName || block.pid || block.id) {
      out.push(block);
    }
  }
  return out;
}

function normalizeProduct(raw: CjListItem): CjProduct | null {
  const id = raw.pid ?? raw.id ?? raw.productId ?? raw.sku ?? raw.productSku;
  const nameRaw = (raw.nameEn ?? raw.productNameEn ?? raw.productName ?? "").trim();
  // Classic list sometimes returns Chinese name as a JSON array string — skip those.
  const name = nameRaw.startsWith("[") ? (raw.productNameEn ?? "").trim() : nameRaw;
  if (!id || !name) return null;

  // When present, only keep products marked on-sale.
  if (raw.saleStatus != null && String(raw.saleStatus) !== "3") return null;

  const inv = raw.warehouseInventoryNum ?? raw.totalVerifiedInventory;
  if (inv != null && inv <= 0) return null;

  const price = toNumber(raw.nowPrice) ?? toNumber(raw.sellPrice);
  if (price == null || price <= 0) return null;

  const sku = String(raw.sku ?? raw.productSku ?? raw.spu ?? id);
  return {
    id: String(id),
    name,
    sku,
    imageUrl: raw.bigImage ?? raw.productImage ?? null,
    sellPriceUsd: price,
    listedNum: raw.listedNum ?? null,
    categoryName: raw.threeCategoryName ?? raw.categoryName ?? null,
    warehouse: raw.defaultArea ?? null,
    weightGrams: toNumber(raw.weight) ?? toNumber(raw.productWeight),
    productUrl: buildCjProductUrl({
      productUrl: raw.productUrl,
      id: String(id),
      sku,
      name,
    }),
  };
}

/**
 * Pull trending / high-listed CJ products, optionally filtered by keyword.
 * Prefer listV2; fall back to classic list with searchType=2 (trending).
 */
export async function searchCjProducts(opts: {
  keyWord?: string;
  page?: number;
  size?: number;
  trending?: boolean;
}): Promise<CjProduct[]> {
  const page = opts.page ?? 1;
  const size = Math.min(40, opts.size ?? 20);

  try {
    const data = await cjGet<CjListData>("/product/listV2", {
      page,
      size,
      keyWord: opts.keyWord,
      countryCode: "GB",
      orderBy: 1, // listing count
      sort: "desc",
    });
    const rows = extractListItems(data);
    const products = rows.map(normalizeProduct).filter((p): p is CjProduct => Boolean(p));
    if (products.length > 0) return products;
  } catch {
    // fall through to classic list
  }

  const data = await cjGet<CjListData>("/product/list", {
    pageNum: page,
    pageSize: size,
    keyWord: opts.keyWord,
    countryCode: "GB",
    searchType: opts.trending ? 2 : 0,
    orderBy: "listedNum",
    sort: "desc",
  });
  return extractListItems(data)
    .map(normalizeProduct)
    .filter((p): p is CjProduct => Boolean(p));
}

/** Rough China→UK postage estimate when CJ freight is missing (£). */
export function estimateInboundFreightGbp(weightGrams: number | null, sellPriceUsd: number): number {
  const kg = Math.max(0.1, (weightGrams ?? 300) / 1000);
  const usd = 2.5 + kg * 8;
  const gbp = usd * 0.79;
  return Math.round(Math.max(2.5, Math.min(25, gbp + sellPriceUsd * 0.02)) * 100) / 100;
}

export function usdToGbp(usd: number): number {
  const rate = Number(process.env.CJ_USD_GBP_RATE ?? "0.79");
  return Math.round(usd * (Number.isFinite(rate) && rate > 0 ? rate : 0.79) * 100) / 100;
}
