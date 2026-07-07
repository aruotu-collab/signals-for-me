import { prisma } from "@/lib/db";
import { parseJobsDetailXlsx, pickupKeyFor, shiplyKeyFromUrl, type ShiplyJobRow } from "@/lib/shiply/parse";
import { extractOutcode, resolveOutcodes } from "@/lib/shiply/geo";

export async function importShiplyJobsFromXlsx(
  buf: Buffer,
): Promise<{ inserted: number; updated: number; total: number; geocoded: number }> {
  const rows = parseJobsDetailXlsx(buf);
  let inserted = 0;
  let updated = 0;

  // Pre-resolve all outward codes in one pass (cached in the Outcode table).
  const allCodes: string[] = [];
  for (const r of rows) {
    const pu = extractOutcode(r.pickupAddress ?? r.pickupTown);
    const de = extractOutcode(r.deliveryAddress ?? r.deliveryTown);
    if (pu) allCodes.push(pu);
    if (de) allCodes.push(de);
  }
  const coords = await resolveOutcodes(allCodes);
  let geocoded = 0;

  for (const r of rows) {
    const shiplyKey = shiplyKeyFromUrl(r.shiplyUrl);
    const { pickupKey, pickupZone } = pickupKeyFor(r.pickupTown, r.pickupAddress ?? null);

    const pickupOutcode = extractOutcode(r.pickupAddress ?? r.pickupTown);
    const deliveryOutcode = extractOutcode(r.deliveryAddress ?? r.deliveryTown);
    const pc = pickupOutcode ? coords.get(pickupOutcode) : undefined;
    const dc = deliveryOutcode ? coords.get(deliveryOutcode) : undefined;
    if (dc) geocoded += 1;

    const existing = await prisma.shiplyJob.findUnique({ where: { shiplyKey } });
    const data = {
      shiplyKey,
      shiplyUrl: r.shiplyUrl,
      title: r.title,
      imageUrl: r.imageUrl ?? null,
      serviceType: r.serviceType,
      service: r.service,
      pickupTown: r.pickupTown,
      pickupAddress: r.pickupAddress ?? null,
      pickupZone,
      pickupKey,
      deliveryTown: r.deliveryTown,
      deliveryAddress: r.deliveryAddress ?? null,
      miles: r.miles ?? null,
      quotes: r.quotes ?? null,
      pickupOutcode: pickupOutcode ?? null,
      deliveryOutcode: deliveryOutcode ?? null,
      pickupLat: pc?.lat ?? null,
      pickupLng: pc?.lng ?? null,
      deliveryLat: dc?.lat ?? null,
      deliveryLng: dc?.lng ?? null,
    };

    if (!existing) {
      await prisma.shiplyJob.create({ data });
      inserted += 1;
    } else {
      await prisma.shiplyJob.update({ where: { shiplyKey }, data });
      updated += 1;
    }
  }

  await rebuildShiplyMatrixIndex();

  return { inserted, updated, total: rows.length, geocoded };
}

export async function rebuildShiplyMatrixIndex() {
  // Build per (service × pickupKey) sorted job keys.
  const jobs = await prisma.shiplyJob.findMany({
    select: { shiplyKey: true, service: true, pickupKey: true, miles: true },
  });

  const map = new Map<string, { service: string; pickupKey: string; keys: { k: string; m: number }[] }>();
  for (const j of jobs) {
    const m = j.miles ?? 9_999_999;
    const key = `${j.service}|||${j.pickupKey}`;
    const entry = map.get(key) ?? { service: j.service, pickupKey: j.pickupKey, keys: [] };
    entry.keys.push({ k: j.shiplyKey, m });
    map.set(key, entry);
  }

  // Upsert cells. (Simple implementation; fine for MVP scale.)
  for (const entry of map.values()) {
    entry.keys.sort((a, b) => a.m - b.m);
    const milesSorted = entry.keys.map((x) => x.m).filter((x) => x !== 9_999_999);
    const minMiles = milesSorted.length ? Math.min(...milesSorted) : null;
    const maxMiles = milesSorted.length ? Math.max(...milesSorted) : null;
    const jobKeys = JSON.stringify(entry.keys.map((x) => x.k));

    await prisma.shiplyMatrixCell.upsert({
      where: { service_pickupKey: { service: entry.service, pickupKey: entry.pickupKey } },
      create: { service: entry.service, pickupKey: entry.pickupKey, jobCount: entry.keys.length, minMiles, maxMiles, jobKeys },
      update: { jobCount: entry.keys.length, minMiles, maxMiles, jobKeys },
    });
  }
}

export async function listMatrixServices() {
  const rows = await prisma.shiplyJob.findMany({
    distinct: ["service"],
    select: { service: true, serviceType: true },
    orderBy: { service: "asc" },
  });
  return rows;
}

export async function listMatrixPickupKeys(limit = 60) {
  const groups = await prisma.shiplyJob.groupBy({
    by: ["pickupKey"],
    _count: { _all: true },
    orderBy: { _count: { pickupKey: "desc" } },
    take: limit,
  });
  return groups.map((g) => ({ pickupKey: g.pickupKey, count: g._count._all }));
}

export async function getMatrixCells(services: string[], pickupKeys: string[]) {
  return prisma.shiplyMatrixCell.findMany({
    where: { service: { in: services }, pickupKey: { in: pickupKeys } },
    select: { service: true, pickupKey: true, jobCount: true, minMiles: true, maxMiles: true, jobKeys: true },
  });
}

export async function getJobsByKeys(keys: string[]) {
  return prisma.shiplyJob.findMany({
    where: { shiplyKey: { in: keys } },
    select: {
      shiplyKey: true,
      shiplyUrl: true,
      title: true,
      imageUrl: true,
      pickupTown: true,
      pickupKey: true,
      deliveryTown: true,
      miles: true,
      quotes: true,
      service: true,
    },
  });
}

export async function listPlannerPickupKeys(limit = 200) {
  const groups = await prisma.shiplyJob.groupBy({
    by: ["pickupKey"],
    _count: { _all: true },
    orderBy: { _count: { pickupKey: "desc" } },
    take: limit,
  });
  return groups.map((g) => ({ pickupKey: g.pickupKey, count: g._count._all }));
}

export async function getPlannerJobs(pickupKey: string, service?: string | null) {
  return prisma.shiplyJob.findMany({
    where: {
      pickupKey,
      ...(service ? { service } : {}),
    },
    orderBy: [{ miles: "asc" }],
    select: {
      shiplyKey: true,
      shiplyUrl: true,
      title: true,
      imageUrl: true,
      pickupTown: true,
      pickupKey: true,
      deliveryTown: true,
      deliveryAddress: true,
      miles: true,
      quotes: true,
      service: true,
      pickupLat: true,
      pickupLng: true,
      deliveryLat: true,
      deliveryLng: true,
    },
  });
}

export type PlannerJob = Awaited<ReturnType<typeof getPlannerJobs>>[number];

// Nearest-next-stop ordering: start at the pickup location, then repeatedly
// pick the closest un-visited delivery point (greedy TSP heuristic). Jobs
// without coordinates are appended at the end sorted by Shiply miles.
export function buildOptimizedRoute(jobs: PlannerJob[]): { ordered: PlannerJob[]; legMiles: (number | null)[] } {
  const geo = jobs.filter((j) => j.deliveryLat != null && j.deliveryLng != null);
  const noGeo = jobs
    .filter((j) => j.deliveryLat == null || j.deliveryLng == null)
    .sort((a, b) => (a.miles ?? 1e9) - (b.miles ?? 1e9));

  // Start point: average of pickup coords if present, else the first delivery.
  const start = pickStart(geo);
  const remaining = [...geo];
  const ordered: PlannerJob[] = [];
  const legMiles: (number | null)[] = [];

  let current = start;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const j = remaining[i];
      const d = haversine(current, { lat: j.deliveryLat as number, lng: j.deliveryLng as number });
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    legMiles.push(Number.isFinite(bestDist) ? Math.round(bestDist) : null);
    current = { lat: next.deliveryLat as number, lng: next.deliveryLng as number };
  }

  for (const j of noGeo) {
    ordered.push(j);
    legMiles.push(null);
  }

  return { ordered, legMiles };
}

function pickStart(geo: PlannerJob[]): { lat: number; lng: number } {
  const withPickup = geo.find((j) => j.pickupLat != null && j.pickupLng != null);
  if (withPickup) return { lat: withPickup.pickupLat as number, lng: withPickup.pickupLng as number };
  if (geo.length) return { lat: geo[0].deliveryLat as number, lng: geo[0].deliveryLng as number };
  return { lat: 51.5074, lng: -0.1278 }; // London fallback
}

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

