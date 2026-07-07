import { prisma } from "@/lib/db";
import { parseJobsDetailXlsx, pickupKeyFor, shiplyKeyFromUrl, type ShiplyJobRow } from "@/lib/shiply/parse";

export async function importShiplyJobsFromXlsx(buf: Buffer): Promise<{ inserted: number; updated: number; total: number }> {
  const rows = parseJobsDetailXlsx(buf);
  let inserted = 0;
  let updated = 0;

  for (const r of rows) {
    const shiplyKey = shiplyKeyFromUrl(r.shiplyUrl);
    const { pickupKey, pickupZone } = pickupKeyFor(r.pickupTown, r.pickupAddress ?? null);

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

  return { inserted, updated, total: rows.length };
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
    },
  });
}

