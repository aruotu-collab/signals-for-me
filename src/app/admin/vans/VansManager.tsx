"use client";

import { useState, useTransition } from "react";
import { cancelEmptyVan, expireStaleVans } from "./actions";

type Van = {
  id: string;
  driverName: string | null;
  driverPhone: string;
  driverEmail: string | null;
  hub: string;
  postcode: string | null;
  headingHub: string | null;
  vanSize: string | null;
  note: string | null;
  status: string;
  availableUntil: string;
  createdAt: string;
};

export function VansManager({
  initialRows,
  counts,
  statusFilter,
}: {
  initialRows: Van[];
  counts: Record<string, number>;
  statusFilter: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function cancel(id: string) {
    if (!confirm("Cancel this empty van listing?")) return;
    startTransition(async () => {
      await cancelEmptyVan(id);
    });
  }

  function expireStale() {
    startTransition(async () => {
      const res = await expireStaleVans();
      if ("updated" in res) setMessage(`Marked ${res.updated} expired listing(s).`);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["all", "active", "cancelled", "expired"] as const).map((s) => (
            <a
              key={s}
              href={s === "all" ? "/admin/vans" : `/admin/vans?status=${s}`}
              className={`rounded-lg px-3 py-1.5 text-sm capitalize transition ${
                statusFilter === s
                  ? "bg-brand-500/20 text-brand-200"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {s} ({counts[s] ?? 0})
            </a>
          ))}
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={expireStale}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
        >
          Expire overdue listings
        </button>
      </div>

      {message && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-200">{message}</div>}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase text-slate-500">
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Heading</th>
              <th className="px-4 py-3">Van</th>
              <th className="px-4 py-3">Until</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {initialRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  No empty van listings match this filter.
                </td>
              </tr>
            ) : (
              initialRows.map((row) => (
                <tr key={row.id} className="text-slate-300">
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(row.createdAt).toLocaleString("en-GB")}
                  </td>
                  <td className="px-4 py-3">
                    <div>{row.driverName ?? "—"}</div>
                    <a href={`tel:${row.driverPhone}`} className="text-xs text-brand-300 hover:underline">
                      {row.driverPhone}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{row.hub}</div>
                    {row.postcode && <div className="text-xs text-slate-500">{row.postcode}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs">{row.headingHub ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">{row.vanSize ?? "—"}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {new Date(row.availableUntil).toLocaleString("en-GB")}
                  </td>
                  <td className="px-4 py-3 text-xs uppercase">{row.status}</td>
                  <td className="px-4 py-3">
                    {row.status === "active" && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => cancel(row.id)}
                        className="text-xs text-red-300 hover:underline disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
