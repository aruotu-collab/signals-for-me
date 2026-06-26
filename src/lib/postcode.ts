// UK postcode validation and enrichment via postcodes.io (free, no API key).

export interface ResolvedLocation {
  postcode: string;
  postcodeDistrict: string;
  country: string;
  region: string | null;
  city: string;
  area: string;
}

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

export function normalizePostcode(raw: string): string {
  const compact = raw.replace(/\s+/g, "").toUpperCase();
  if (compact.length < 5) return compact;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

export function isValidUkPostcodeFormat(raw: string): boolean {
  return UK_POSTCODE_RE.test(raw.trim());
}

export function outwardCode(postcode: string): string {
  return normalizePostcode(postcode).split(" ")[0] ?? postcode;
}

type PostcodesIoResult = {
  postcode: string;
  country: string;
  region: string;
  admin_district: string;
  admin_ward: string;
  parish: string;
  outcode: string;
};

function displayCountry(country: string): string {
  const c = country.trim();
  if (/^(England|Scotland|Wales|Northern Ireland)$/i.test(c)) return "United Kingdom";
  return c;
}

function displayCity(result: PostcodesIoResult): string {
  if (/london/i.test(result.region)) return "London";
  return result.admin_district || result.region || "Unknown";
}

function displayArea(result: PostcodesIoResult, city: string): string {
  const ward = result.admin_ward?.trim();
  if (ward && !/^none$/i.test(ward)) {
    return ward.replace(/\s+(ward)$/i, "");
  }
  const parish = result.parish?.replace(/, unparished area$/i, "").trim();
  if (parish && parish !== city) return parish;
  return result.admin_district || city;
}

export async function lookupUkPostcode(raw: string): Promise<ResolvedLocation | { error: string }> {
  const trimmed = raw.trim();
  if (!trimmed) return { error: "Enter your postcode." };
  if (!isValidUkPostcodeFormat(trimmed)) {
    return { error: "Enter a valid UK postcode (e.g. SE6 1AA)." };
  }

  const compact = trimmed.replace(/\s+/g, "");
  const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(compact)}`, {
    next: { revalidate: 86400 },
  });

  if (res.status === 404) return { error: "We couldn't find that postcode. Check and try again." };
  if (!res.ok) return { error: "Postcode lookup failed. Try again in a moment." };

  const body = (await res.json()) as { result: PostcodesIoResult | null };
  const result = body.result;
  if (!result) return { error: "We couldn't find that postcode." };

  const city = displayCity(result);
  const area = displayArea(result, city);

  return {
    postcode: normalizePostcode(result.postcode),
    postcodeDistrict: result.outcode || outwardCode(result.postcode),
    country: displayCountry(result.country),
    region: result.region || null,
    city,
    area,
  };
}

export function locationSnapshot(loc: ResolvedLocation) {
  return {
    postcode: loc.postcode,
    postcodeDistrict: loc.postcodeDistrict,
    locationCountry: loc.country,
    locationRegion: loc.region,
    locationCity: loc.city,
    locationArea: loc.area,
  };
}
