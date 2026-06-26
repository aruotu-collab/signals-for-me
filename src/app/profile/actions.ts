"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { locationSnapshot, type UserLocation } from "@/lib/location";

export async function saveConsumerLocation(loc: UserLocation) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to save your location." };

  const country = loc.locationCountry?.trim();
  const region = loc.locationRegion?.trim();
  const city = loc.locationCity?.trim();
  const area = loc.locationArea?.trim();

  if (!country || !region || !area) {
    return { error: "Please select your country, region, and town/area." };
  }

  const snapshot = locationSnapshot({
    locationCountry: country,
    locationRegion: region,
    locationCity: city || area,
    locationArea: area,
  });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: snapshot,
    }),
    prisma.demandVote.updateMany({
      where: { userId: user.id },
      data: snapshot,
    }),
  ]);

  revalidatePath("/ideas");
  revalidatePath("/dashboard");
  return { ok: true };
}
