"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  FAVOURITES_EVENT,
  readLocalFavourites,
  sortFavourites,
  toFavouriteInput,
  writeLocalFavourites,
  type FavouriteInput,
  type FavouriteItem,
} from "@/lib/favourites";
import { addFavourite, clearFavouritesServer, removeFavourite, syncFavourites } from "@/app/favourites/actions";

type FavouritesContextValue = {
  favourites: FavouriteItem[];
  count: number;
  ready: boolean;
  signedIn: boolean;
  isFav: (key: string) => boolean;
  toggle: (item: FavouriteInput) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const FavouritesContext = createContext<FavouritesContextValue | null>(null);

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

  // Initial hydrate from localStorage, then (if signed in) merge with the DB.
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
        .catch(() => {
          // Keep local state on failure.
        });
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
        const exists = prev.some((f) => f.key === item.key);
        const next = exists
          ? prev.filter((f) => f.key !== item.key)
          : [{ ...item, savedAt: Date.now() }, ...prev];
        const sorted = sortFavourites(next);
        writeLocalFavourites(sorted);
        if (signedIn) {
          (exists ? removeFavourite(item.key) : addFavourite(item)).catch(() => {});
        }
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

  const isFav = useCallback((key: string) => favourites.some((f) => f.key === key), [favourites]);

  return (
    <FavouritesContext.Provider
      value={{ favourites, count: favourites.length, ready, signedIn, isFav, toggle, remove, clear }}
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
