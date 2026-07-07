import { prisma } from "@/lib/db";

// Extract a UK outward code (e.g. "SW1A", "B90", "OL3", "EC1V") from a
// free-text address. Returns uppercase outward code or null.
export function extractOutcode(address?: string | null): string | null {
  if (!address) return null;
  // Skip obviously non-UK addresses (contain a country other than UK at the end).
  const s = address.trim().toUpperCase();
  // Outward code: 1-2 letters, 1 digit, optional trailing letter/digit.
  // We look for it as a comma-separated token near the end.
  const tokens = s.split(",").map((t) => t.trim());
  for (let i = tokens.length - 1; i >= 0; i--) {
    const m = tokens[i].match(/^([A-Z]{1,2}\d[A-Z\d]?)$/);
    if (m) return m[1];
  }
  // Fallback: any outward-code-looking token anywhere.
  const m = s.match(/\b([A-Z]{1,2}\d[A-Z\d]?)\b/);
  return m ? m[1] : null;
}

async function fetchOutcode(code: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(code)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: { latitude?: number; longitude?: number } };
    const lat = data.result?.latitude;
    const lng = data.result?.longitude;
    if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
    return null;
  } catch {
    return null;
  }
}

// Resolve many outward codes to coordinates, using the Outcode cache first and
// filling misses from postcodes.io with limited concurrency.
export async function resolveOutcodes(codes: string[]): Promise<Map<string, { lat: number; lng: number }>> {
  const unique = Array.from(new Set(codes.filter(Boolean).map((c) => c.toUpperCase())));
  const result = new Map<string, { lat: number; lng: number }>();
  if (unique.length === 0) return result;

  const cached = await prisma.outcode.findMany({ where: { code: { in: unique } } });
  for (const c of cached) result.set(c.code, { lat: c.lat, lng: c.lng });

  const misses = unique.filter((c) => !result.has(c));
  const CONCURRENCY = 8;
  for (let i = 0; i < misses.length; i += CONCURRENCY) {
    const batch = misses.slice(i, i + CONCURRENCY);
    const resolved = await Promise.all(
      batch.map(async (code) => ({ code, coord: await fetchOutcode(code) })),
    );
    for (const { code, coord } of resolved) {
      if (!coord) continue;
      result.set(code, coord);
      await prisma.outcode.upsert({
        where: { code },
        create: { code, lat: coord.lat, lng: coord.lng },
        update: { lat: coord.lat, lng: coord.lng },
      });
    }
  }

  return result;
}

// Resolve a free-text UK place name (e.g. "Sunbury-on-Thames, United Kingdom")
// to coordinates via the postcodes.io places API. Cached in the Outcode table
// under a synthetic "PLACE:<slug>" key so repeat lookups are instant.
export async function geocodePlaceName(name?: string | null): Promise<{ lat: number; lng: number } | null> {
  if (!name) return null;
  const cleaned = name
    .replace(/,?\s*(united kingdom|uk|england|scotland|wales|northern ireland|great britain)\.?$/i, "")
    .trim();
  if (!cleaned) return null;

  const cacheKey = `PLACE:${cleaned.toUpperCase()}`;
  const cached = await prisma.outcode.findUnique({ where: { code: cacheKey } });
  if (cached) return { lat: cached.lat, lng: cached.lng };

  try {
    const res = await fetch(`https://api.postcodes.io/places?q=${encodeURIComponent(cleaned)}&limit=1`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      result?: { latitude?: number; longitude?: number }[];
    };
    const place = data.result?.[0];
    const lat = place?.latitude;
    const lng = place?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number") return null;
    await prisma.outcode.upsert({
      where: { code: cacheKey },
      create: { code: cacheKey, lat, lng },
      update: { lat, lng },
    });
    return { lat, lng };
  } catch {
    return null;
  }
}

// Haversine distance in miles between two lat/lng points.
export function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8; // Earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
