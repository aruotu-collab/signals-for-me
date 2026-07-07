// Shared driver settings types, defaults, and localStorage helpers.

export type DriverSettings = {
  mpg: number;
  fuelPpl: number;
  minHourlyRate: number;
  includeReturnLeg: boolean;
  /** When true, hide jobs that fall below minHourlyRate. */
  onlyWorthIt: boolean;
};

export const DEFAULT_SETTINGS: DriverSettings = {
  mpg: 28,
  fuelPpl: 1.45,
  minHourlyRate: 15,
  includeReturnLeg: false,
  onlyWorthIt: false,
};

export const DRIVER_SETTINGS_EVENT = "sfm-driver-settings-changed";
export const DRIVER_SETTINGS_STORAGE_KEY = "sfm.driverSettings.v2";

export function clampNumber(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

export function normalizeDriverSettings(raw: Partial<DriverSettings> | null): DriverSettings {
  if (!raw) return { ...DEFAULT_SETTINGS };
  return {
    mpg: clampNumber(raw.mpg, 8, 80, DEFAULT_SETTINGS.mpg),
    fuelPpl: clampNumber(raw.fuelPpl, 0.5, 4, DEFAULT_SETTINGS.fuelPpl),
    minHourlyRate: clampNumber(raw.minHourlyRate, 0, 200, DEFAULT_SETTINGS.minHourlyRate),
    includeReturnLeg: Boolean(raw.includeReturnLeg),
    onlyWorthIt: Boolean(raw.onlyWorthIt),
  };
}

function migrateV1(): DriverSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("sfm.driverSettings.v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DriverSettings>;
    const migrated = normalizeDriverSettings(parsed);
    window.localStorage.setItem(DRIVER_SETTINGS_STORAGE_KEY, JSON.stringify(migrated));
    window.localStorage.removeItem("sfm.driverSettings.v1");
    return migrated;
  } catch {
    return null;
  }
}

export function readLocalDriverSettings(): DriverSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(DRIVER_SETTINGS_STORAGE_KEY);
    if (!raw) {
      const migrated = migrateV1();
      return migrated ?? { ...DEFAULT_SETTINGS };
    }
    return normalizeDriverSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeLocalDriverSettings(settings: DriverSettings) {
  if (typeof window === "undefined") return;
  try {
    const normalized = normalizeDriverSettings(settings);
    window.localStorage.setItem(DRIVER_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new Event(DRIVER_SETTINGS_EVENT));
  } catch {
    // Ignore quota / private-mode errors.
  }
}

export function isCustomDriverSettings(settings: DriverSettings): boolean {
  return (
    settings.mpg !== DEFAULT_SETTINGS.mpg ||
    settings.fuelPpl !== DEFAULT_SETTINGS.fuelPpl ||
    settings.minHourlyRate !== DEFAULT_SETTINGS.minHourlyRate ||
    settings.includeReturnLeg !== DEFAULT_SETTINGS.includeReturnLeg ||
    settings.onlyWorthIt !== DEFAULT_SETTINGS.onlyWorthIt
  );
}
