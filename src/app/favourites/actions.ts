"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { FavouriteInput, FavouriteItem, FavouriteSource, JobStatus, ManualJobInput } from "@/lib/favourites";
import { manualFavourite, mergeJobStatus } from "@/lib/favourites";

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

function toItem(row: {
  key: string;
  source: string;
  sourceId: string;
  url: string;
  title: string;
  imageUrl: string | null;
  line1: string | null;
  service: string | null;
  detail: string | null;
  status: string;
  miles: number | null;
  quotes: number | null;
  actualBid: number | null;
  notes: string | null;
  savedAt: Date;
  wonAt: Date | null;
  completedAt: Date | null;
}): FavouriteItem {
  return {
    key: row.key,
    source: row.source as FavouriteSource,
    sourceId: row.sourceId,
    url: row.url,
    title: row.title,
    imageUrl: row.imageUrl,
    line1: row.line1,
    service: row.service,
    detail: row.detail,
    status: row.status as JobStatus,
    miles: row.miles,
    quotes: row.quotes,
    actualBid: row.actualBid,
    notes: row.notes,
    savedAt: row.savedAt.getTime(),
    wonAt: row.wonAt?.getTime() ?? null,
    completedAt: row.completedAt?.getTime() ?? null,
  };
}

function createData(userId: string, item: FavouriteInput) {
  return {
    userId,
    key: item.key,
    source: item.source,
    sourceId: item.sourceId,
    url: item.url,
    title: item.title,
    imageUrl: item.imageUrl,
    line1: item.line1,
    service: item.service,
    detail: item.detail,
    status: item.status ?? "saved",
    miles: item.miles,
    quotes: item.quotes,
    actualBid: item.actualBid,
    notes: item.notes,
    wonAt: item.wonAt ? new Date(item.wonAt) : item.status === "won" || item.status === "completed" ? new Date() : null,
    completedAt: item.completedAt ? new Date(item.completedAt) : item.status === "completed" ? new Date() : null,
    savedAt: item.savedAt ? new Date(item.savedAt) : undefined,
  };
}

async function listForUser(userId: string): Promise<FavouriteItem[]> {
  const rows = await prisma.savedJob.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { savedAt: "desc" }],
  });
  return rows.map(toItem);
}

async function getRow(userId: string, key: string) {
  return prisma.savedJob.findUnique({ where: { userId_key: { userId, key } } });
}

/**
 * Called on load for signed-in users: merges any local (anonymous) favourites
 * into the DB, then returns the full server-side list. Returns null when the
 * user is not signed in so the client keeps using localStorage only.
 */
export async function syncFavourites(localItems: FavouriteInput[]): Promise<FavouriteItem[] | null> {
  const userId = await currentUserId();
  if (!userId) return null;

  if (localItems.length > 0) {
    for (const item of localItems.slice(0, 500)) {
      const existing = await prisma.savedJob.findUnique({
        where: { userId_key: { userId, key: item.key } },
      });
      if (existing) {
        const mergedStatus = mergeJobStatus(existing.status as JobStatus, item.status ?? "saved");
        await prisma.savedJob.update({
          where: { userId_key: { userId, key: item.key } },
          data: {
            status: mergedStatus,
            miles: item.miles ?? existing.miles,
            quotes: item.quotes ?? existing.quotes,
            actualBid: item.actualBid ?? existing.actualBid,
            notes: item.notes ?? existing.notes,
            wonAt: existing.wonAt ?? (item.wonAt ? new Date(item.wonAt) : null),
            completedAt: existing.completedAt ?? (item.completedAt ? new Date(item.completedAt) : null),
          },
        });
      } else {
        await prisma.savedJob.create({ data: createData(userId, item) });
      }
    }
  }

  return listForUser(userId);
}

export async function addFavourite(item: FavouriteInput): Promise<{ ok: boolean }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false };
  const existing = await getRow(userId, item.key);
  if (existing) {
    await prisma.savedJob.update({
      where: { userId_key: { userId, key: item.key } },
      data: {
        miles: item.miles ?? existing.miles,
        quotes: item.quotes ?? existing.quotes,
      },
    });
  } else {
    await prisma.savedJob.create({ data: createData(userId, { ...item, status: item.status ?? "saved" }) });
  }
  return { ok: true };
}

export async function removeFavourite(key: string): Promise<{ ok: boolean }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false };
  await prisma.savedJob.deleteMany({ where: { userId, key } });
  return { ok: true };
}

export async function clearFavouritesServer(): Promise<{ ok: boolean }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false };
  await prisma.savedJob.deleteMany({ where: { userId } });
  return { ok: true };
}

export async function markJobWon(key: string, actualBid?: number): Promise<{ ok: boolean }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false };
  const row = await getRow(userId, key);
  if (!row) return { ok: false };

  let bid = actualBid ?? row.actualBid;
  if (bid == null && row.miles != null) {
    // Leave null — client may prompt; DB update still sets status
  }

  await prisma.savedJob.update({
    where: { userId_key: { userId, key } },
    data: {
      status: "won",
      actualBid: bid,
      wonAt: row.wonAt ?? new Date(),
      completedAt: null,
    },
  });
  return { ok: true };
}

export async function markJobCompleted(key: string): Promise<{ ok: boolean }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false };
  const row = await getRow(userId, key);
  if (!row) return { ok: false };

  await prisma.savedJob.update({
    where: { userId_key: { userId, key } },
    data: {
      status: "completed",
      completedAt: new Date(),
      wonAt: row.wonAt ?? new Date(),
    },
  });
  return { ok: true };
}

export async function markJobSaved(key: string): Promise<{ ok: boolean }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false };
  const row = await getRow(userId, key);
  if (!row) return { ok: false };

  await prisma.savedJob.update({
    where: { userId_key: { userId, key } },
    data: {
      status: "saved",
      wonAt: null,
      completedAt: null,
      actualBid: null,
    },
  });
  return { ok: true };
}

export async function updateJobFields(
  key: string,
  patch: {
    actualBid?: number | null;
    notes?: string | null;
    miles?: number | null;
    title?: string;
    line1?: string | null;
  },
): Promise<{ ok: boolean }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false };
  const row = await getRow(userId, key);
  if (!row) return { ok: false };

  await prisma.savedJob.update({
    where: { userId_key: { userId, key } },
    data: {
      actualBid: patch.actualBid !== undefined ? patch.actualBid : undefined,
      notes: patch.notes !== undefined ? patch.notes : undefined,
      miles: patch.miles !== undefined ? patch.miles : undefined,
      title: patch.title !== undefined ? patch.title : undefined,
      line1: patch.line1 !== undefined ? patch.line1 : undefined,
    },
  });
  return { ok: true };
}

export async function addManualJobServer(input: ManualJobInput): Promise<{ ok: boolean; item?: FavouriteItem }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false };

  const fav = manualFavourite(input);
  const now = Date.now();
  const row = await prisma.savedJob.create({
    data: {
      ...createData(userId, {
        ...fav,
        savedAt: now,
        wonAt: now,
        completedAt: null,
      }),
    },
  });
  return { ok: true, item: toItem(row) };
}

export async function persistJobState(item: FavouriteInput): Promise<{ ok: boolean }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false };
  const existing = await getRow(userId, item.key);
  if (existing) {
    await prisma.savedJob.update({
      where: { userId_key: { userId, key: item.key } },
      data: {
        status: item.status,
        miles: item.miles ?? existing.miles,
        quotes: item.quotes ?? existing.quotes,
        actualBid: item.actualBid,
        notes: item.notes,
        wonAt: item.wonAt ? new Date(item.wonAt) : item.status === "won" || item.status === "completed" ? existing.wonAt ?? new Date() : null,
        completedAt: item.completedAt ? new Date(item.completedAt) : item.status === "completed" ? new Date() : null,
      },
    });
  } else {
    await prisma.savedJob.create({ data: createData(userId, item) });
  }
  return { ok: true };
}
