"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function IngestButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/ingest", { method: "POST" });
      const data = await res.json();
      setMsg(`Scanned ${data.itemsFetched} · ${data.signalsKept} new · ${data.duplicates} dupes`);
      router.refresh();
    } catch {
      setMsg("Scan failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-xs text-slate-400">{msg}</span>}
      <button onClick={run} disabled={loading} className="btn-ghost text-sm disabled:opacity-50">
        {loading ? "Scanning…" : "Scan for signals"}
      </button>
    </div>
  );
}
