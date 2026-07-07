"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  FAVOURITES_EVENT,
  activeJobCount,
  manualFavourite,
  readLocalFavourites,
  sortFavourites,
  toFavouriteInput,
  writeLocalFavourites,
  type FavouriteInput,
  type FavouriteItem,
  type JobStatus,
  type ManualJobInput,
} from "@/lib/favourites";
import {
  addFavourite,
  addManualJobServer,
  clearFavouritesServer,
  markJobCompleted,
  markJobSaved,
  markJobWon,
  removeFavourite,
  syncFavourites,
  updateJobFields,
} from "@/app/favourites/actions";

type FavouritesContextValue = {
  favourites: FavouriteItem[];
  count: number;
  activeCount: number;
  ready: boolean;
  signedIn: boolean;
  isFav: (key: string) => boolean;
  getJob: (key: string) => FavouriteItem | undefined;
  toggle: (item: FavouriteInput) => void;
  remove: (key: string) => void;
  clear: () => void;
  markWon: (key: string, actualBid?: number) => void;
  markCompleted: (key: string) => void;
  markSaved: (key: string) => void;
  updateJob: (key: string, patch: Partial<Pick<FavouriteItem, "actualBid" | "notes" | "miles" | "title" | "line1">>) => void;
  addManual: (input: ManualJobInput) => FavouriteItem | null;
  byStatus: (status: JobStatus) => FavouriteItem[];
};

const FavouritesContext = createContext<FavouritesContextValue | null>(null);

function applyPatch(list: FavouriteItem[], key: string, patch: Partial<FavouriteItem>): FavouriteItem[] {
  return list.map((j) => (j.key === key ? { ...j, ...patch } : j));
}

export function FavouritesProvider({
  signedIn,
  children,
}: {
  signedIn: boolean;
  children: React.ReactNode;
}) {
  const [favourites, setFavourites] = useState<FavouriteItem[]>([]);
  const [ready, setReady] = useState(false);
  const syncedRef = useRef(false);

  useEffect(() => {
    const local = sortFavourites(readLocalFavourites());
    setFavourites(local);
    setReady(true);

    if (signedIn && !syncedRef.current) {
      syncedRef.current = true;
      syncFavourites(local.map(toFavouriteInput))
        .then((merged) => {
          if (!merged) return;
          const sorted = sortFavourites(merged);
          setFavourites(sorted);
          writeLocalFavourites(sorted);
        })
        .catch(() => {});
    }

    const onChange = () => setFavourites(sortFavourites(readLocalFavourites()));
    window.addEventListener(FAVOURITES_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(FAVOURITES_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [signedIn]);

  const persistLocal = useCallback((list: FavouriteItem[]) => {
    const sorted = sortFavourites(list);
    setFavourites(sorted);
    writeLocalFavourites(sorted);
  }, []);

  const toggle = useCallback(
    (item: FavouriteInput) => {
      setFavourites((prev) => {
        const exists = prev.find((f) => f.key === item.key);
        if (exists) {
          const sorted = sortFavourites(prev.filter((f) => f.key !== item.key));
          writeLocalFavourites(sorted);
          if (signedIn) removeFavourite(item.key).catch(() => {});
          return sorted;
        }
        const next: FavouriteItem = {
          ...item,
          status: item.status ?? "saved",
          miles: item.miles ?? null,
          quotes: item.quotes ?? null,
          actualBid: item.actualBid ?? null,
          notes: item.notes ?? null,
          savedAt: Date.now(),
          wonAt: null,
          completedAt: null,
        };
        const sorted = sortFavourites([next, ...prev]);
        writeLocalFavourites(sorted);
        if (signedIn) addFavourite(toFavouriteInput(next)).catch(() => {});
        return sorted;
      });
    },
    [signedIn],
  );

  const remove = useCallback(
    (key: string) => {
      setFavourites((prev) => {
        const sorted = sortFavourites(prev.filter((f) => f.key !== key));
        writeLocalFavourites(sorted);
        if (signedIn) removeFavourite(key).catch(() => {});
        return sorted;
      });
    },
    [signedIn],
  );

  const clear = useCallback(() => {
    persistLocal([]);
    if (signedIn) clearFavouritesServer().catch(() => {});
  }, [persistLocal, signedIn]);

  const markWon = useCallback(
    (key: string, actualBid?: number) => {
      setFavourites((prev) => {
        const job = prev.find((f) => f.key === key);
        if (!job) return prev;
        const updated: FavouriteItem = {
          ...job,
          status: "won",
          actualBid: actualBid ?? job.actualBid,
          wonAt: job.wonAt ?? Date.now(),
          completedAt: null,
        };
        const next = sortFavourites(applyPatch(prev, key, updated));
        writeLocalFavourites(next);
        if (signedIn) markJobWon(key, actualBid).catch(() => {});
        return next;
      });
    },
    [signedIn],
  );

  const markCompleted = useCallback(
    (key: string) => {
      setFavourites((prev) => {
        const job = prev.find((f) => f.key === key);
        if (!job) return prev;
        const updated: FavouriteItem = {
          ...job,
          status: "completed",
          wonAt: job.wonAt ?? Date.now(),
          completedAt: Date.now(),
        };
        const next = sortFavourites(applyPatch(prev, key, updated));
        writeLocalFavourites(next);
        if (signedIn) markJobCompleted(key).catch(() => {});
        return next;
      });
    },
    [signedIn],
  );

  const markSaved = useCallback(
    (key: string) => {
      setFavourites((prev) => {
        const job = prev.find((f) => f.key === key);
        if (!job) return prev;
        const updated: FavouriteItem = {
          ...job,
          status: "saved",
          actualBid: null,
          wonAt: null,
          completedAt: null,
        };
        const next = sortFavourites(applyPatch(prev, key, updated));
        writeLocalFavourites(next);
        if (signedIn) markJobSaved(key).catch(() => {});
        return next;
      });
    },
    [signedIn],
  );

  const updateJob = useCallback(
    (key: string, patch: Partial<Pick<FavouriteItem, "actualBid" | "notes" | "miles" | "title" | "line1">>) => {
      setFavourites((prev) => {
        const job = prev.find((f) => f.key === key);
        if (!job) return prev;
        const updated = { ...job, ...patch };
        const next = sortFavourites(applyPatch(prev, key, updated));
        writeLocalFavourites(next);
        if (signedIn) updateJobFields(key, patch).catch(() => {});
        return next;
      });
    },
    [signedIn],
  );

  const addManual = useCallback(
    (input: ManualJobInput): FavouriteItem | null => {
      const fav = manualFavourite(input);
      const item: FavouriteItem = {
        ...fav,
        savedAt: Date.now(),
        wonAt: Date.now(),
        completedAt: null,
      };
      setFavourites((prev) => {
        const next = sortFavourites([item, ...prev]);
        writeLocalFavourites(next);
        if (signedIn) {
          addManualJobServer(input).catch(() => {});
        }
        return next;
      });
      return item;
    },
    [signedIn],
  );

  const isFav = useCallback((key: string) => favourites.some((f) => f.key === key), [favourites]);
  const getJob = useCallback((key: string) => favourites.find((f) => f.key === key), [favourites]);
  const byStatus = useCallback((status: JobStatus) => favourites.filter((f) => f.status === status), [favourites]);

  return (
    <FavouritesContext.Provider
      value={{
        favourites,
        count: favourites.length,
        activeCount: activeJobCount(favourites),
        ready,
        signedIn,
        isFav,
        getJob,
        toggle,
        remove,
        clear,
        markWon,
        markCompleted,
        markSaved,
        updateJob,
        addManual,
        byStatus,
      }}
    >
      {children}
    </FavouritesContext.Provider>
  );
}

export function useFavourites(): FavouritesContextValue {
  const ctx = useContext(FavouritesContext);
  if (!ctx) {
    throw new Error("useFavourites must be used within a FavouritesProvider");
  }
  return ctx;
}
