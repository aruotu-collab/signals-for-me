// OpenStreetMap Nominatim place search (free; respect 1 req/s usage policy).

import type { UserLocation } from "@/lib/location";

const USER_AGENT = "SignalsForMe/1.0 (https://signalsforme.com; contact: signals@signalsforme.com)";

export interface PlaceSuggestion {
  label: string;
  location: UserLocation;
}

type NominatimAddress = {
  country?: string;
  state?: string;
  region?: string;
  county?: string;
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
  neighbourhood?: string;
  quarter?: string;
  city_district?: string;
};

type NominatimResult = {
  display_name: string;
  address?: NominatimAddress;
  name?: string;
};

function firstNonEmpty(...values: (string | undefined)[]): string {
  for (const v of values) {
    const t = v?.trim();
    if (t) return t;
  }
  return "";
}

function parseResult(result: NominatimResult): PlaceSuggestion | null {
  const addr = result.address;
  if (!addr?.country) return null;

  const region = firstNonEmpty(addr.state, addr.region, addr.county);
  const city = firstNonEmpty(addr.city, addr.city_district, addr.town, addr.village);
  const area = firstNonEmpty(
    addr.suburb,
    addr.neighbourhood,
    addr.quarter,
    result.name,
    addr.town,
    addr.village,
    city,
  );

  if (!region || !area) return null;

  const location: UserLocation = {
    locationCountry: addr.country,
    locationRegion: region,
    locationCity: city || area,
    locationArea: area,
  };

  const label =
    city && city !== area
      ? `${area}, ${city}, ${region}, ${addr.country}`
      : `${area}, ${region}, ${addr.country}`;

  return { label, location };
}

export async function searchPlaces(input: {
  query: string;
  countryCode: string;
  regionName?: string;
}): Promise<PlaceSuggestion[]> {
  const q = input.query.trim();
  if (q.length < 2) return [];

  const parts = [q];
  if (input.regionName) parts.push(input.regionName);
  const searchQ = parts.join(", ");

  const params = new URLSearchParams({
    q: searchQ,
    format: "json",
    addressdetails: "1",
    limit: "10",
    countrycodes: input.countryCode.toLowerCase(),
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return [];

  const results = (await res.json()) as NominatimResult[];
  const seen = new Set<string>();
  const out: PlaceSuggestion[] = [];

  for (const r of results) {
    const parsed = parseResult(r);
    if (!parsed) continue;
    const key = [
      parsed.location.locationCountry,
      parsed.location.locationRegion,
      parsed.location.locationArea,
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(parsed);
    if (out.length >= 8) break;
  }

  return out;
}
