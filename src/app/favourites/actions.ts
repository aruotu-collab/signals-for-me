"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { FavouriteInput, FavouriteItem, FavouriteSource } from "@/lib/favourites";

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
  savedAt: Date;
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
    savedAt: row.savedAt.getTime(),
  };
}

async function listForUser(userId: string): Promise<FavouriteItem[]> {
  const rows = await prisma.savedJob.findMany({
    where: { userId },
    orderBy: { savedAt: "desc" },
  });
  return rows.map(toItem);
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
    await prisma.$transaction(
      localItems.slice(0, 500).map((item) =>
        prisma.savedJob.upsert({
          where: { userId_key: { userId, key: item.key } },
          create: {
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
          },
          update: {}, // keep original savedAt if already present
        }),
      ),
    );
  }

  return listForUser(userId);
}

export async function addFavourite(item: FavouriteInput): Promise<{ ok: boolean }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false };
  await prisma.savedJob.upsert({
    where: { userId_key: { userId, key: item.key } },
    create: {
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
    },
    update: {},
  });
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
