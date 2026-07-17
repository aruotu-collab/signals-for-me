"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  FLIP_DESK_EVENT,
  computeDeskStats,
  opportunityToDeskItem,
  readFlipDesk,
  sortDesk,
  writeFlipDesk,
  type FlipDeskItem,
  type FlipDeskStats,
  type FlipDeskStatus,
} from "@/lib/flip/desk";
import type { FlipOpportunity } from "@/lib/flip/types";

type FlipDeskContextValue = {
  items: FlipDeskItem[];
  ready: boolean;
  stats: FlipDeskStats;
  activeCount: number;
  isWatching: (id: string) => boolean;
  getItem: (id: string) => FlipDeskItem | undefined;
  watch: (opp: FlipOpportunity) => void;
  unwatch: (id: string) => void;
  setStatus: (id: string, status: FlipDeskStatus, patch?: Partial<FlipDeskItem>) => void;
  markWon: (id: string, buyPrice: number) => void;
  markLost: (id: string) => void;
  markSelling: (id: string) => void;
  markSold: (id: string, sellPrice: number, actualProfit?: number) => void;
  updateNotes: (id: string, notes: string) => void;
  clearLost: () => void;
  byStatus: (status: FlipDeskStatus) => FlipDeskItem[];
};

const FlipDeskContext = createContext<FlipDeskContextValue | null>(null);

export function FlipDeskProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<FlipDeskItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(sortDesk(readFlipDesk()));
    setReady(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key !== "sfm.flipDesk.v1") return;
      setItems(sortDesk(readFlipDesk()));
    };
    const onCustom = () => setItems(sortDesk(readFlipDesk()));
    window.addEventListener("storage", onStorage);
    window.addEventListener(FLIP_DESK_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(FLIP_DESK_EVENT, onCustom);
    };
  }, []);

  const persist = useCallback((next: FlipDeskItem[]) => {
    const sorted = sortDesk(next);
    setItems(sorted);
    writeFlipDesk(sorted);
  }, []);

  const watch = useCallback(
    (opp: FlipOpportunity) => {
      const existing = readFlipDesk();
      if (existing.some((x) => x.id === opp.id)) return;
      persist([...existing, opportunityToDeskItem(opp)]);
    },
    [persist],
  );

  const unwatch = useCallback(
    (id: string) => {
      persist(readFlipDesk().filter((x) => x.id !== id));
    },
    [persist],
  );

  const setStatus = useCallback(
    (id: string, status: FlipDeskStatus, patch: Partial<FlipDeskItem> = {}) => {
      persist(
        readFlipDesk().map((x) =>
          x.id === id ? { ...x, ...patch, status, updatedAt: Date.now() } : x,
        ),
      );
    },
    [persist],
  );

  const markWon = useCallback(
    (id: string, buyPrice: number) => {
      setStatus(id, "won", { buyPrice, wonAt: Date.now(), currentPrice: buyPrice });
    },
    [setStatus],
  );

  const markLost = useCallback(
    (id: string) => {
      setStatus(id, "lost");
    },
    [setStatus],
  );

  const markSelling = useCallback(
    (id: string) => {
      setStatus(id, "selling");
    },
    [setStatus],
  );

  const markSold = useCallback(
    (id: string, sellPrice: number, actualProfit?: number) => {
      const item = readFlipDesk().find((x) => x.id === id);
      const buy = item?.buyPrice ?? item?.currentPrice ?? 0;
      const feesGuess = sellPrice * 0.129 + 8;
      const profit =
        actualProfit != null && Number.isFinite(actualProfit)
          ? actualProfit
          : Math.round((sellPrice - buy - feesGuess) * 100) / 100;
      setStatus(id, "sold", { sellPrice, actualProfit: profit, soldAt: Date.now() });
    },
    [setStatus],
  );

  const updateNotes = useCallback(
    (id: string, notes: string) => {
      persist(
        readFlipDesk().map((x) => (x.id === id ? { ...x, notes, updatedAt: Date.now() } : x)),
      );
    },
    [persist],
  );

  const clearLost = useCallback(() => {
    persist(readFlipDesk().filter((x) => x.status !== "lost"));
  }, [persist]);

  const stats = useMemo(() => computeDeskStats(items), [items]);
  const activeCount = stats.watching + stats.bidding + stats.won + stats.selling;

  const value: FlipDeskContextValue = {
    items,
    ready,
    stats,
    activeCount,
    isWatching: (id) => items.some((x) => x.id === id),
    getItem: (id) => items.find((x) => x.id === id),
    watch,
    unwatch,
    setStatus,
    markWon,
    markLost,
    markSelling,
    markSold,
    updateNotes,
    clearLost,
    byStatus: (status) => items.filter((x) => x.status === status),
  };

  return <FlipDeskContext.Provider value={value}>{children}</FlipDeskContext.Provider>;
}

export function useFlipDesk() {
  const ctx = useContext(FlipDeskContext);
  if (!ctx) throw new Error("useFlipDesk must be used within FlipDeskProvider");
  return ctx;
}
