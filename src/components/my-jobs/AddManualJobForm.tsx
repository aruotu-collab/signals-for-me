"use client";

import { useState } from "react";
import { useFavourites } from "@/components/FavouritesProvider";
import type { ManualJobInput } from "@/lib/favourites";

export function AddManualJobForm({ onClose }: { onClose: () => void }) {
  const { addManual } = useFavourites();
  const [form, setForm] = useState<ManualJobInput>({
    title: "",
    pickup: "",
    delivery: "",
    miles: 50,
    payment: 150,
    service: "",
    notes: "",
    url: "",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pickup.trim() || !form.delivery.trim() || form.miles < 1 || form.payment <= 0) return;
    addManual(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button aria-label="Close" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative z-10 w-full max-w-lg rounded-t-2xl border border-white/10 bg-ink-900 p-5 sm:rounded-2xl"
      >
        <h2 className="text-lg font-semibold text-white">Add job won elsewhere</h2>
        <p className="mt-1 text-xs text-slate-400">
          Track work from direct customers, other platforms, or repeat clients — all in one place.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Pickup" value={form.pickup} onChange={(v) => setForm((f) => ({ ...f, pickup: v }))} required />
          <Field label="Delivery" value={form.delivery} onChange={(v) => setForm((f) => ({ ...f, delivery: v }))} required />
          <Field label="Miles" type="number" value={String(form.miles)} onChange={(v) => setForm((f) => ({ ...f, miles: Number(v) || 0 }))} required />
          <Field label="You're paid (£)" type="number" value={String(form.payment)} onChange={(v) => setForm((f) => ({ ...f, payment: Number(v) || 0 }))} required />
          <div className="sm:col-span-2">
            <Field label="Title (optional)" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} />
          </div>
          <div className="sm:col-span-2">
            <Field label="Category (optional)" value={form.service ?? ""} onChange={(v) => setForm((f) => ({ ...f, service: v }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-400">
              Notes
              <textarea
                value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </label>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost px-4 py-2 text-sm">
            Cancel
          </button>
          <button type="submit" className="btn-primary px-4 py-2 text-sm">
            Add to won jobs
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-xs text-slate-400">
      {label}
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
      />
    </label>
  );
}
