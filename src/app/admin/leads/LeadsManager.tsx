"use client";

import { useTransition } from "react";
import { updateServiceRequestStatus } from "./actions";
import { formatRequestLocation, SERVICE_REQUEST_STATUSES, urgencyLabel } from "@/lib/serviceRequest";

type Lead = {
  id: string;
  serviceName: string;
  slug: string | null;
  urgency: string;
  details: string | null;
  contactPhone: string;
  contactName: string | null;
  locationCountry: string | null;
  locationRegion: string | null;
  locationCity: string | null;
  locationArea: string | null;
  status: string;
  callPhoneShown: string | null;
  createdAt: string;
};

export function LeadsManager({ initialRows, counts }: { initialRows: Lead[]; counts: Record<string, number> }) {
  const [pending, startTransition] = useTransition();

  function setStatus(id: string, status: string) {
    startTransition(async () => {
      await updateServiceRequestStatus(id, status);
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SERVICE_REQUEST_STATUSES.map((s) => (
          <div key={s.value} className="card p-4">
            <div className="text-2xl font-bold text-white">{(counts[s.value] ?? 0).toLocaleString()}</div>
            <div className="text-xs text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase text-slate-500">
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Urgency</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {initialRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No service requests yet.
                </td>
              </tr>
            ) : (
              initialRows.map((row) => (
                <tr key={row.id} className="text-slate-300">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                    {new Date(row.createdAt).toLocaleString("en-GB")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{row.serviceName}</div>
                    {row.details && <div className="mt-1 text-xs text-slate-500 line-clamp-2">{row.details}</div>}
                    {row.slug && (
                      <a href={`/need/${row.slug}`} className="text-xs text-brand-300 hover:underline" target="_blank" rel="noreferrer">
                        /need/{row.slug}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">{formatRequestLocation(row)}</td>
                  <td className="px-4 py-3">
                    <a href={`tel:${row.contactPhone}`} className="text-brand-300 hover:underline">
                      {row.contactPhone}
                    </a>
                    {row.contactName && <div className="text-xs text-slate-500">{row.contactName}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs">{urgencyLabel(row.urgency)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={row.status}
                      disabled={pending}
                      onChange={(e) => setStatus(row.id, e.target.value)}
                      className="rounded-lg border border-white/10 bg-ink-900 px-2 py-1 text-xs text-white"
                    >
                      {SERVICE_REQUEST_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
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
