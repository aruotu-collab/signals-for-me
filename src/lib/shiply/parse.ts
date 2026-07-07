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

export function parseJobsDetailXlsx(buf: Buffer, sheetName = "Jobs Detail"): ShiplyJobRow[] {
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    const available = wb.SheetNames.join(", ");
    throw new Error(`Missing sheet "${sheetName}". Available: ${available}`);
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
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

