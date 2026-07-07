"use server";

import { auth } from "@/auth";
import { normalizeDriverSettings, type DriverSettings } from "@/lib/shiply/driverSettingsCore";
import { getDriverProfile, resetDriverProfile, syncDriverProfile, upsertDriverProfile } from "@/lib/shiply/driverSettingsDb";

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Merge local settings into account; returns server copy or null if signed out. */
export async function syncDriverSettings(local: DriverSettings): Promise<DriverSettings | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  return syncDriverProfile(userId, normalizeDriverSettings(local));
}

export async function saveDriverSettings(settings: DriverSettings): Promise<{ ok: boolean }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false };
  await upsertDriverProfile(userId, settings);
  return { ok: true };
}

export async function resetDriverSettingsServer(): Promise<{ ok: boolean }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false };
  await resetDriverProfile(userId);
  return { ok: true };
}

export async function loadDriverSettings(): Promise<DriverSettings | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  return getDriverProfile(userId);
}
