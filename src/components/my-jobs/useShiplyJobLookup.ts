"use client";

import { useEffect, useState } from "react";
import type { ShiplyJobLookup } from "@/lib/jobProfit";

export function useShiplyJobLookup(keys: string[]): Map<string, ShiplyJobLookup> {
  const [lookup, setLookup] = useState<Map<string, ShiplyJobLookup>>(new Map());

  useEffect(() => {
    if (keys.length === 0) {
      setLookup(new Map());
      return;
    }
    let cancelled = false;
    fetch("/api/shiply/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keys }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const map = new Map<string, ShiplyJobLookup>();
        for (const j of d.jobs ?? []) {
          map.set(j.shiplyKey, {
            miles: j.miles,
            quotes: j.quotes,
            service: j.service,
          });
        }
        setLookup(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [keys.join(",")]);

  return lookup;
}
