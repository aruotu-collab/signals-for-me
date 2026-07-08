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
  // DeliveryQuoteCompare: .../load/details/id/1257104
  const dqc = url.match(/\/load\/details\/id\/(\d+)/i);
  if (dqc?.[1]) return `DQC-${dqc[1]}`;

  // Shiply: https://www.shiply.com/transport/.../9JXGX06QA
  const shiply = url.match(/\/([A-Z0-9]{6,12})$/i);
  if (shiply?.[1]) return shiply[1].toUpperCase();

  return url.toUpperCase();
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

/** Split a DQC "TownPOSTCODE" or "Town, County, Outcode" string into town + full address. */
export function splitTownPostcode(raw: string): { town: string; address: string } {
  const s = raw.trim();
  if (!s) return { town: "Unknown", address: "" };

  // Already Shiply-style "Town, County, Outcode"
  if (s.includes(",")) {
    return { town: townFromAddress(s), address: s };
  }

  // DQC glued form: "Barnard CastleDL12 8LQ" or "BelfastBT12 6HR" or "SouthamptonSO"
  const m = s.match(/^(.*?)([A-Z]{1,2}\d[A-Z\d]?(?:\s*\d[A-Z]{2})?)$/i);
  if (m) {
    const town = m[1].trim() || "Unknown";
    const postcode = m[2].trim().toUpperCase().replace(/\s+/, " ");
    return { town: townFromAddress(town), address: `${town}, ${postcode}` };
  }

  return { town: townFromAddress(s), address: s };
}

export function computeLondonZone(addressOrTown: string): string | null {
  const s = addressOrTown.toUpperCase();
  const m = s.match(/\b(EC|WC|SW|SE|NW|NE|W|E|N)\d?[A-Z]?\b/);
  if (!m) return null;
  return m[1];
}

export function pickupKeyFor(
  town: string,
  pickupAddress?: string | null,
): { pickupKey: string; pickupZone: string | null } {
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

/** Service names shown in Pickup Radar and buyer job forms. */
export const MATRIX_SERVICE_NAMES = Object.keys(SERVICE_TYPE_BY_CATEGORY).sort((a, b) => a.localeCompare(b));

/** Map DeliveryQuoteCompare category labels onto our Radar service names. */
const DQC_CATEGORY_TO_SERVICE: Record<string, string> = {
  "Furniture & general items": "Furniture & General Items",
  "Cars, motorcycles & vehicles": "Cars",
  Caravans: "Other Vehicles",
  "Boat & watercrafts": "Boats",
  "Vehicle parts": "Vehicle Parts",
  "House removals": "Moving Home",
  "Office & commercial removals": "Moving Home",
  "Road haulage": "Haulage",
  "Pallet delivery": "Haulage",
  "Heavy equipment & machinery": "Haulage",
  "Sea freight": "Haulage",
  "Air freight": "Haulage",
  "Freight forwarding": "Haulage",
  "Electrical items": "Other",
  "Special care items": "Other",
  "Parcel delivery": "Boxes",
  Pianos: "Pianos",
  Other: "Other",
};

function mapDqcCategory(raw: string): { service: string; serviceType: string } {
  const service = DQC_CATEGORY_TO_SERVICE[raw] ?? "Other";
  return {
    service,
    serviceType: SERVICE_TYPE_BY_CATEGORY[service] ?? "Deliveries",
  };
}

/** Map scrape filenames like "cars shiply (1).csv" onto Radar service names. */
const FILENAME_TO_SERVICE: Record<string, string> = {
  cars: "Cars",
  motorcycle: "Motorcycles",
  motorcycles: "Motorcycles",
  "other vehicle": "Other Vehicles",
  "other vehicles": "Other Vehicles",
  "vehicle parts": "Vehicle Parts",
  boats: "Boats",
  boat: "Boats",
  "furniture and general items": "Furniture & General Items",
  "furniture & general items": "Furniture & General Items",
  boxes: "Boxes",
  piano: "Pianos",
  pianos: "Pianos",
  other: "Other",
  "moving home": "Moving Home",
  haulage: "Haulage",
  "pets & livestock": "Pets & Livestock",
  "pets and livestock": "Pets & Livestock",
};

export function categoryFromFilename(filename: string): { service: string; serviceType: string } {
  const base = filename
    .replace(/\.(xlsx|xls|csv)$/i, "")
    .replace(/\s*\(\d+\)\s*$/i, "")
    .replace(/\s+shiply\s*$/i, "")
    .replace(/^shiply\s+/i, "")
    .trim()
    .toLowerCase();

  const mapped = FILENAME_TO_SERVICE[base];
  const service = mapped ?? (base ? base.replace(/\b\w/g, (c) => c.toUpperCase()) : "Unknown");
  const serviceType = SERVICE_TYPE_BY_CATEGORY[service] ?? "Deliveries";
  return { service, serviceType };
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

function isListingsFormat(columns: string[]): boolean {
  const set = new Set(columns.map((c) => c.trim().toLowerCase()));
  return set.has("item name") && set.has("link") && set.has("collection location");
}

function isDeliveryQuoteCompareFormat(columns: string[]): boolean {
  const set = new Set(columns.map((c) => c.trim().toLowerCase()));
  return set.has("description href") && set.has("address-details") && set.has("distance 2");
}

function parseDeliveryQuoteCompareRows(rows: Record<string, unknown>[]): ShiplyJobRow[] {
  return rows
    .map((r) => {
      const url = firstString(r, ["description href"]);
      const title = firstString(r, ["description 2"]);
      const categoryRaw = firstString(r, ["description"]);
      const pickupRaw = firstString(r, ["address-details"]);
      const deliveryRaw = firstString(r, ["address-details 3"]);
      if (!url || !title || !pickupRaw || !deliveryRaw) return null;

      const { service, serviceType } = mapDqcCategory(categoryRaw || "Other");
      const pickup = splitTownPostcode(pickupRaw);
      const delivery = splitTownPostcode(deliveryRaw);

      return {
        serviceType,
        service,
        pickupTown: pickup.town,
        deliveryTown: delivery.town,
        pickupAddress: pickup.address,
        deliveryAddress: delivery.address,
        miles: asInt(firstString(r, ["distance 2"]) || null),
        quotes: asInt(firstString(r, ["quotes-count"]) || null),
        title,
        shiplyUrl: url,
        imageUrl: firstString(r, ["thumb src"]) || null,
      } satisfies ShiplyJobRow;
    })
    .filter(Boolean) as ShiplyJobRow[];
}

function parseListingsRows(rows: Record<string, unknown>[]): ShiplyJobRow[] {
  return rows
    .map((r) => {
      const shiplyUrl = firstString(r, ["Link", "link"]);
      const title = firstString(r, ["Item Name", "item name"]);
      const collection = firstString(r, ["Collection Location", "collection location"]);
      const delivery = firstString(r, ["Delivery Location", "delivery location"]);
      if (!shiplyUrl || !title || !collection || !delivery) return null;

      const category = firstString(r, ["Category", "category"]) || "Other";
      const serviceType = SERVICE_TYPE_BY_CATEGORY[category] ?? "Deliveries";

      return {
        serviceType,
        service: category,
        pickupTown: townFromAddress(collection),
        deliveryTown: townFromAddress(delivery),
        pickupAddress: collection,
        deliveryAddress: delivery,
        miles: asInt(firstString(r, ["Mileage", "mileage"]) || null),
        quotes: asInt(firstString(r, ["Number of Quotes", "number of quotes"]) || null),
        title,
        shiplyUrl,
        imageUrl: null,
      } satisfies ShiplyJobRow;
    })
    .filter(Boolean) as ShiplyJobRow[];
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
  if (isDeliveryQuoteCompareFormat(columns)) {
    return parseDeliveryQuoteCompareRows(rows);
  }
  if (isListingsFormat(columns)) {
    return parseListingsRows(rows);
  }
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
