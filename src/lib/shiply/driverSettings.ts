"use client";

import { useCallback, useEffect, useState } from "react";

// Per-driver preferences that personalise Pickup Radar route intelligence.
// Stored in localStorage so they apply instantly without an account.

export type DriverSettings = {
  /** Van fuel economy in miles per (UK) gallon. */
  mpg: number;
  /** Diesel price in £ per litre. */
  fuelPpl: number;
  /** Minimum acceptable £/hour for a job to count as "worth it". */
  minHourlyRate: number;
  /** Count the empty return leg (miles home) in fuel cost. */
  includeReturnLeg: boolean;
};

export const DEFAULT_SETTINGS: DriverSettings = {
  mpg: 28,
  fuelPpl: 1.45,
  minHourlyRate: 15,
  includeReturnLeg: false,
};

const STORAGE_KEY = "sfm.driverSettings.v1";
const EVENT = "sfm-driver-settings-changed";

function clampNumber(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

function normalize(raw: Partial<DriverSettings> | null): DriverSettings {
  if (!raw) return { ...DEFAULT_SETTINGS };
  return {
    mpg: clampNumber(raw.mpg, 8, 80, DEFAULT_SETTINGS.mpg),
    fuelPpl: clampNumber(raw.fuelPpl, 0.5, 4, DEFAULT_SETTINGS.fuelPpl),
    minHourlyRate: clampNumber(raw.minHourlyRate, 0, 200, DEFAULT_SETTINGS.minHourlyRate),
    includeReturnLeg: Boolean(raw.includeReturnLeg),
  };
}

export function readDriverSettings(): DriverSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return normalize(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function writeDriverSettings(settings: DriverSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Ignore quota / private-mode errors.
  }
}

export function useDriverSettings() {
  const [settings, setSettings] = useState<DriverSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setSettings(readDriverSettings());
    sync();
    setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((patch: Partial<DriverSettings>) => {
    const next = normalize({ ...readDriverSettings(), ...patch });
    writeDriverSettings(next);
    setSettings(next);
  }, []);

  const reset = useCallback(() => {
    writeDriverSettings({ ...DEFAULT_SETTINGS });
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  const isCustom =
    settings.mpg !== DEFAULT_SETTINGS.mpg ||
    settings.fuelPpl !== DEFAULT_SETTINGS.fuelPpl ||
    settings.minHourlyRate !== DEFAULT_SETTINGS.minHourlyRate ||
    settings.includeReturnLeg !== DEFAULT_SETTINGS.includeReturnLeg;

  return { settings, update, reset, ready, isCustom };
}
