import * as XLSX from "xlsx";

export type ShiplyJobRow = {
  serviceType: string;
  service: string;
  pickupTown: string;
  deliveryTown: string;
  pickupAddress?: string | null;
  deliveryAddress?: string | null;
  miles?: number | null;
  quotes?: number | null;
  title: string;
  shiplyUrl: string;
  imageUrl?: string | null;
};

function asString(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function asInt(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).replace(/[^\d-]/g, "");
  if (!s) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

export function shiplyKeyFromUrl(url: string): string {
  // examples:
  // https://www.shiply.com/transport/.../9JXGX06QA
  const m = url.match(/\/([A-Z0-9]{6,12})$/i);
  return (m?.[1] ?? url).toUpperCase();
}

export function computeLondonZone(addressOrTown: string): string | null {
  // Capture outward code prefixes like SW7, W6, SE15, EC1V, WC2N, NW1.
  const s = addressOrTown.toUpperCase();
  const m = s.match(/\b(EC|WC|SW|SE|NW|NE|W|E|N)\d?[A-Z]?\b/);
  if (!m) return null;
  // Map SW7 -> SW
  const prefix = m[1];
  return prefix;
}

export function pickupKeyFor(town: string, pickupAddress?: string | null): { pickupKey: string; pickupZone: string | null } {
  const t = town.trim();
  const maybeLondon = t.toLowerCase().includes("london");
  const zone = computeLondonZone([t, pickupAddress ?? ""].join(" "));
  if (maybeLondon && zone) return { pickupKey: `London ${zone}`, pickupZone: zone };
  return { pickupKey: t || "Unknown", pickupZone: maybeLondon ? zone : null };
}

const SERVICE_TYPE_BY_CATEGORY: Record<string, string> = {
  "Furniture & General Items": "Deliveries",
  Boxes: "Deliveries",
  Pianos: "Deliveries",
  Other: "Deliveries",
  Cars: "Vehicle Deliveries",
  Motorcycles: "Vehicle Deliveries",
  "Other Vehicles": "Vehicle Deliveries",
  "Vehicle Parts": "Vehicle Deliveries",
  Boats: "Vehicle Deliveries",
  "Moving Home": "Removals",
  Haulage: "Haulage",
  "Pets & Livestock": "Pets & Livestock",
};

export function categoryFromFilename(filename: string): { service: string; serviceType: string } {
  const base = filename
    .replace(/\.(xlsx|xls|csv)$/i, "")
    .replace(/^shiply\s+/i, "")
    .trim();
  const service = base || "Unknown";
  const serviceType = SERVICE_TYPE_BY_CATEGORY[service] ?? "Deliveries";
  return { service, serviceType };
}

export function townFromAddress(address: string): string {
  const a = address.trim();
  if (!a) return "Unknown";
  if (a.toLowerCase().includes("london")) return "London";
  const parts = a
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts[0] || "Unknown";
}

function firstString(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = asString(row[key]);
    if (v) return v;
  }
  return "";
}

function isScrapedShiplyFormat(columns: string[]): boolean {
  return columns.some((c) => c === "anchor-visited-highlight href" || c === "search-cell-box-content-address");
}

function parseScrapedRows(
  rows: Record<string, unknown>[],
  defaults: { service: string; serviceType: string },
): ShiplyJobRow[] {
  return rows
    .map((r) => {
      const shiplyUrl = firstString(r, [
        "anchor-visited-highlight href",
        "table-search-result-padding href",
        "responsive-table-padding href",
      ]);
      const title = asString(r["anchor-visited-highlight"]);
      const pickupAddress = firstString(r, ["search-cell-box-content-address"]);
      const deliveryAddress = firstString(r, ["search-cell-box-content-address 2"]);
      if (!shiplyUrl || !title || !pickupAddress || !deliveryAddress) return null;

      return {
        serviceType: defaults.serviceType,
        service: defaults.service,
        pickupTown: townFromAddress(pickupAddress),
        deliveryTown: townFromAddress(deliveryAddress),
        pickupAddress,
        deliveryAddress,
        miles: asInt(firstString(r, ["responsive-table-padding", "table-search-result-padding"]) || null),
        quotes: asInt(firstString(r, ["responsive-table-padding 2", "table-search-result-padding 2"]) || null),
        title,
        shiplyUrl,
        imageUrl: asString(r["thumbnail-photo src"]) || null,
      } satisfies ShiplyJobRow;
    })
    .filter(Boolean) as ShiplyJobRow[];
}

function parseJobsDetailRows(rows: Record<string, unknown>[]): ShiplyJobRow[] {
  return rows
    .map((r) => {
      const serviceType = asString(r["Service Type"]);
      const service = asString(r["Service"]);
      const pickupTown = asString(r["Pickup Town"]);
      const deliveryTown = asString(r["Delivery Town"]);
      const title = asString(r["Job Title"]);
      const shiplyUrl = asString(r["Shiply Job Link"]);
      if (!service || !pickupTown || !deliveryTown || !title || !shiplyUrl) return null;

      return {
        serviceType: serviceType || "Deliveries",
        service,
        pickupTown,
        deliveryTown,
        pickupAddress: asString(r["Pickup Address"]) || null,
        deliveryAddress: asString(r["Delivery Address"]) || null,
        miles: asInt(r["Miles"]),
        quotes: asInt(r["Quotes"]),
        title,
        shiplyUrl,
        imageUrl: asString(r["Image URL"]) || null,
      } satisfies ShiplyJobRow;
    })
    .filter(Boolean) as ShiplyJobRow[];
}

export type ParseShiplyOptions = {
  sheetName?: string;
  service?: string;
  serviceType?: string;
  filename?: string;
};

export function parseShiplyXlsx(buf: Buffer, opts: ParseShiplyOptions = {}): ShiplyJobRow[] {
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheetName = opts.sheetName ?? (wb.SheetNames.includes("Jobs Detail") ? "Jobs Detail" : wb.SheetNames[0]);
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    throw new Error(`Missing sheet "${sheetName}". Available: ${wb.SheetNames.join(", ")}`);
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  if (!rows.length) return [];

  const columns = Object.keys(rows[0] ?? {});
  if (isScrapedShiplyFormat(columns)) {
    const defaults = {
      service: opts.service ?? (opts.filename ? categoryFromFilename(opts.filename).service : "Unknown"),
      serviceType: opts.serviceType ?? (opts.filename ? categoryFromFilename(opts.filename).serviceType : "Deliveries"),
    };
    return parseScrapedRows(rows, defaults);
  }

  return parseJobsDetailRows(rows);
}

export function parseJobsDetailXlsx(buf: Buffer, sheetName = "Jobs Detail"): ShiplyJobRow[] {
  return parseShiplyXlsx(buf, { sheetName });
}

