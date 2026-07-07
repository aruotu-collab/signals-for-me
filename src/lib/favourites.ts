"use client";

import { useCallback, useEffect, useState } from "react";

// Driver "favourite" Shiply jobs. Stored in localStorage so drivers can shortlist
// jobs to bid on without needing an account. We keep a snapshot of the display
// fields so the Saved page renders instantly and still works if a job later
// drops out of the imported dataset.

export type FavouriteJob = {
  shiplyKey: string;
  shiplyUrl: string;
  title: string;
  imageUrl: string | null;
  pickupTown: string;
  pickupKey: string;
  deliveryTown: string;
  miles: number | null;
  quotes: number | null;
  service: string;
  savedAt: number;
};

const STORAGE_KEY = "sfm.favourites.v1";
const EVENT = "sfm-favourites-changed";

function read(): FavouriteJob[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FavouriteJob[]) : [];
  } catch {
    return [];
  }
}

function write(list: FavouriteJob[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Ignore quota / private-mode errors.
  }
}

export function getFavourites(): FavouriteJob[] {
  return read().sort((a, b) => b.savedAt - a.savedAt);
}

export function isFavourite(key: string): boolean {
  return read().some((j) => j.shiplyKey === key);
}

/** Add or remove a job. Returns the new favourite state (true = now saved). */
export function toggleFavourite(job: Omit<FavouriteJob, "savedAt">): boolean {
  const list = read();
  const idx = list.findIndex((j) => j.shiplyKey === job.shiplyKey);
  if (idx >= 0) {
    list.splice(idx, 1);
    write(list);
    return false;
  }
  list.push({ ...job, savedAt: Date.now() });
  write(list);
  return true;
}

export function removeFavourite(key: string) {
  write(read().filter((j) => j.shiplyKey !== key));
}

export function clearFavourites() {
  write([]);
}

/** React hook that stays in sync across components and browser tabs. */
export function useFavourites() {
  const [favourites, setFavourites] = useState<FavouriteJob[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setFavourites(getFavourites());
    sync();
    setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((job: Omit<FavouriteJob, "savedAt">) => toggleFavourite(job), []);
  const remove = useCallback((key: string) => removeFavourite(key), []);
  const isFav = useCallback(
    (key: string) => favourites.some((j) => j.shiplyKey === key),
    [favourites],
  );

  return { favourites, isFav, toggle, remove, count: favourites.length, ready };
}
