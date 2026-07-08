import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseShiplyXlsx, pickupKeyFor, shiplyKeyFromUrl, type ParseShiplyOptions } from "@/lib/shiply/parse";
import { extractOutcode, resolveOutcodes } from "@/lib/shiply/geo";
import { assignPickupHub, hubRank, isKnownHub } from "@/lib/shiply/hubs";

export async function backfillPickupHubs(): Promise<{ updated: number }> {
  const jobs = await prisma.shiplyJob.findMany({
    select: {
      id: true,
      pickupTown: true,
      pickupKey: true,
      pickupAddress: true,
      pickupLat: true,
      pickupLng: true,
    },
  });

  let updated = 0;
  for (const j of jobs) {
    const pickupHub = assignPickupHub(j);
    await prisma.shiplyJob.update({ where: { id: j.id }, data: { pickupHub } });
    updated += 1;
  }
  return { updated };
}

export async function importShiplyJobsFromXlsx(
  buf: Buffer,
  opts: ParseShiplyOptions = {},
): Promise<{ inserted: number; updated: number; total: number; geocoded: number }> {
  const rows = parseShiplyXlsx(buf, opts);
  let inserted = 0;
  let updated = 0;

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

    const pickupHub = assignPickupHub({
      pickupTown: r.pickupTown,
      pickupKey,
      pickupAddress: r.pickupAddress ?? null,
      pickupLat: pc?.lat ?? null,
      pickupLng: pc?.lng ?? null,
    });

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
      pickupHub,
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

/**
 * Full refresh: wipe all Shiply jobs and the matrix, then bulk-insert the given
 * rows and rebuild the index. Far faster than per-row upsert for large files
 * (batched createMany instead of ~2 queries/row), so it's safe over a remote DB.
 */
export async function refreshShiplyJobsFromRows(
  rows: ReturnType<typeof parseShiplyXlsx>,
  onProgress?: (msg: string) => void,
): Promise<{ inserted: number; total: number; geocoded: number; skippedDuplicates: number }> {
  const log = onProgress ?? (() => {});

  // Geocode every referenced outward code once (cached in the Outcode table).
  const allCodes: string[] = [];
  for (const r of rows) {
    const pu = extractOutcode(r.pickupAddress ?? r.pickupTown);
    const de = extractOutcode(r.deliveryAddress ?? r.deliveryTown);
    if (pu) allCodes.push(pu);
    if (de) allCodes.push(de);
  }
  log(`Geocoding ${new Set(allCodes).size} unique outward codes…`);
  const coords = await resolveOutcodes(allCodes);

  // Build rows, de-duplicating by shiplyKey (the unique constraint).
  const seen = new Set<string>();
  let skippedDuplicates = 0;
  let geocoded = 0;
  const data: Prisma.ShiplyJobCreateManyInput[] = [];

  for (const r of rows) {
    const shiplyKey = shiplyKeyFromUrl(r.shiplyUrl);
    if (seen.has(shiplyKey)) {
      skippedDuplicates += 1;
      continue;
    }
    seen.add(shiplyKey);

    const { pickupKey, pickupZone } = pickupKeyFor(r.pickupTown, r.pickupAddress ?? null);
    const pickupOutcode = extractOutcode(r.pickupAddress ?? r.pickupTown);
    const deliveryOutcode = extractOutcode(r.deliveryAddress ?? r.deliveryTown);
    const pc = pickupOutcode ? coords.get(pickupOutcode) : undefined;
    const dc = deliveryOutcode ? coords.get(deliveryOutcode) : undefined;
    if (dc) geocoded += 1;

    const pickupHub = assignPickupHub({
      pickupTown: r.pickupTown,
      pickupKey,
      pickupAddress: r.pickupAddress ?? null,
      pickupLat: pc?.lat ?? null,
      pickupLng: pc?.lng ?? null,
    });

    data.push({
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
      pickupHub,
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
    });
  }

  log(`Wiping existing jobs and matrix…`);
  await prisma.shiplyMatrixCell.deleteMany({});
  await prisma.shiplyJob.deleteMany({});

  let inserted = 0;
  const BATCH = 1000;
  for (let i = 0; i < data.length; i += BATCH) {
    const batch = data.slice(i, i + BATCH);
    const res = await prisma.shiplyJob.createMany({ data: batch, skipDuplicates: true });
    inserted += res.count;
    log(`Inserted ${inserted}/${data.length}…`);
  }

  log(`Rebuilding matrix index…`);
  await rebuildShiplyMatrixIndex();

  return { inserted, total: rows.length, geocoded, skippedDuplicates };
}

export async function rebuildShiplyMatrixIndex() {
  const jobs = await prisma.shiplyJob.findMany({
    select: { shiplyKey: true, service: true, pickupHub: true, pickupKey: true, miles: true },
  });

  const map = new Map<
    string,
    { service: string; pickupHub: string; areas: Set<string>; keys: { k: string; m: number }[] }
  >();

  for (const j of jobs) {
    const m = j.miles ?? 9_999_999;
    const key = `${j.service}|||${j.pickupHub}`;
    const entry = map.get(key) ?? { service: j.service, pickupHub: j.pickupHub, areas: new Set<string>(), keys: [] };
    entry.areas.add(j.pickupKey);
    entry.keys.push({ k: j.shiplyKey, m });
    map.set(key, entry);
  }

  await prisma.shiplyMatrixCell.deleteMany({});

  for (const entry of map.values()) {
    entry.keys.sort((a, b) => a.m - b.m);
    const milesSorted = entry.keys.map((x) => x.m).filter((x) => x !== 9_999_999);
    const minMiles = milesSorted.length ? Math.min(...milesSorted) : null;
    const maxMiles = milesSorted.length ? Math.max(...milesSorted) : null;
    const jobKeys = JSON.stringify(entry.keys.map((x) => x.k));

    await prisma.shiplyMatrixCell.create({
      data: {
        service: entry.service,
        pickupHub: entry.pickupHub,
        jobCount: entry.keys.length,
        areaCount: entry.areas.size,
        minMiles,
        maxMiles,
        jobKeys,
      },
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

export async function listMatrixHubs(limit = 120) {
  const groups = await prisma.shiplyJob.groupBy({
    by: ["pickupHub"],
    _count: { _all: true },
  });
  return groups
    .filter((g) => isKnownHub(g.pickupHub))
    .sort((a, b) => {
      if (b._count._all !== a._count._all) return b._count._all - a._count._all;
      return hubRank(a.pickupHub) - hubRank(b.pickupHub);
    })
    .slice(0, limit)
    .map((g) => ({ pickupHub: g.pickupHub, count: g._count._all }));
}

/** @deprecated use listMatrixHubs */
export const listMatrixPickupKeys = listMatrixHubs;

export async function getMatrixCells(services: string[], pickupHubs: string[]) {
  return prisma.shiplyMatrixCell.findMany({
    where: { service: { in: services }, pickupHub: { in: pickupHubs } },
    select: {
      service: true,
      pickupHub: true,
      jobCount: true,
      areaCount: true,
      minMiles: true,
      maxMiles: true,
      jobKeys: true,
    },
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
      pickupHub: true,
      deliveryTown: true,
      miles: true,
      quotes: true,
      service: true,
    },
  });
}

export async function listPlannerHubs(limit = 120) {
  return listMatrixHubs(limit);
}

/** @deprecated use listPlannerHubs */
export const listPlannerPickupKeys = listPlannerHubs;

export async function getPlannerJobs(pickupHub: string, service?: string | null) {
  return prisma.shiplyJob.findMany({
    where: {
      pickupHub,
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
      pickupHub: true,
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

export function buildOptimizedRoute(jobs: PlannerJob[]): { ordered: PlannerJob[]; legMiles: (number | null)[] } {
  const geo = jobs.filter((j) => j.deliveryLat != null && j.deliveryLng != null);
  const noGeo = jobs
    .filter((j) => j.deliveryLat == null || j.deliveryLng == null)
    .sort((a, b) => (a.miles ?? 1e9) - (b.miles ?? 1e9));

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
  return { lat: 51.5074, lng: -0.1278 };
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
