"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  DEFAULT_SETTINGS,
  DRIVER_SETTINGS_EVENT,
  isCustomDriverSettings,
  normalizeDriverSettings,
  readLocalDriverSettings,
  writeLocalDriverSettings,
  type DriverSettings,
} from "@/lib/shiply/driverSettingsCore";
import { resetDriverSettingsServer, saveDriverSettings, syncDriverSettings } from "@/app/driver/actions";

type DriverSettingsContextValue = {
  settings: DriverSettings;
  ready: boolean;
  signedIn: boolean;
  isCustom: boolean;
  update: (patch: Partial<DriverSettings>) => void;
  reset: () => void;
};

const DriverSettingsContext = createContext<DriverSettingsContextValue | null>(null);

export function DriverSettingsProvider({
  signedIn,
  children,
}: {
  signedIn: boolean;
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<DriverSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const syncedRef = useRef(false);

  useEffect(() => {
    const local = readLocalDriverSettings();
    setSettings(local);
    setReady(true);

    if (signedIn && !syncedRef.current) {
      syncedRef.current = true;
      syncDriverSettings(local)
        .then((merged) => {
          if (!merged) return;
          const normalized = normalizeDriverSettings(merged);
          setSettings(normalized);
          writeLocalDriverSettings(normalized);
        })
        .catch(() => {});
    }

    const onChange = () => setSettings(readLocalDriverSettings());
    window.addEventListener(DRIVER_SETTINGS_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(DRIVER_SETTINGS_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [signedIn]);

  const persist = useCallback(
    (next: DriverSettings) => {
      const normalized = normalizeDriverSettings(next);
      setSettings(normalized);
      writeLocalDriverSettings(normalized);
      if (signedIn) saveDriverSettings(normalized).catch(() => {});
    },
    [signedIn],
  );

  const update = useCallback(
    (patch: Partial<DriverSettings>) => {
      persist(normalizeDriverSettings({ ...readLocalDriverSettings(), ...patch }));
    },
    [persist],
  );

  const reset = useCallback(() => {
    persist({ ...DEFAULT_SETTINGS });
    if (signedIn) resetDriverSettingsServer().catch(() => {});
  }, [persist, signedIn]);

  return (
    <DriverSettingsContext.Provider
      value={{
        settings,
        ready,
        signedIn,
        isCustom: isCustomDriverSettings(settings),
        update,
        reset,
      }}
    >
      {children}
    </DriverSettingsContext.Provider>
  );
}

export function useDriverSettings(): DriverSettingsContextValue {
  const ctx = useContext(DriverSettingsContext);
  if (!ctx) {
    throw new Error("useDriverSettings must be used within a DriverSettingsProvider");
  }
  return ctx;
}
