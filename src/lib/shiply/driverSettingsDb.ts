import { prisma } from "@/lib/db";
import { DEFAULT_SETTINGS, normalizeDriverSettings, type DriverSettings } from "@/lib/shiply/driverSettingsCore";

function fromRow(row: {
  mpg: number;
  fuelPpl: number;
  minHourlyRate: number;
  includeReturnLeg: boolean;
  onlyWorthIt: boolean;
}): DriverSettings {
  return normalizeDriverSettings({
    mpg: row.mpg,
    fuelPpl: row.fuelPpl,
    minHourlyRate: row.minHourlyRate,
    includeReturnLeg: row.includeReturnLeg,
    onlyWorthIt: row.onlyWorthIt,
  });
}

export async function getDriverProfile(userId: string): Promise<DriverSettings | null> {
  const row = await prisma.driverProfile.findUnique({ where: { userId } });
  return row ? fromRow(row) : null;
}

export async function upsertDriverProfile(userId: string, settings: DriverSettings): Promise<DriverSettings> {
  const data = normalizeDriverSettings(settings);
  const row = await prisma.driverProfile.upsert({
    where: { userId },
    create: {
      userId,
      mpg: data.mpg,
      fuelPpl: data.fuelPpl,
      minHourlyRate: data.minHourlyRate,
      includeReturnLeg: data.includeReturnLeg,
      onlyWorthIt: data.onlyWorthIt,
    },
    update: {
      mpg: data.mpg,
      fuelPpl: data.fuelPpl,
      minHourlyRate: data.minHourlyRate,
      includeReturnLeg: data.includeReturnLeg,
      onlyWorthIt: data.onlyWorthIt,
    },
  });
  return fromRow(row);
}

/** Merge local settings into the account; local wins on each field. */
export async function syncDriverProfile(userId: string, local: DriverSettings): Promise<DriverSettings> {
  return upsertDriverProfile(userId, local);
}

export async function resetDriverProfile(userId: string): Promise<DriverSettings> {
  return upsertDriverProfile(userId, { ...DEFAULT_SETTINGS });
}
