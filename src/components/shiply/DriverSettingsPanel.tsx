"use client";

import { useState } from "react";
import { useDriverSettings } from "@/lib/shiply/driverSettings";

export function DriverSettingsPanel() {
  const { settings, update, reset, ready, isCustom } = useDriverSettings();
  const [open, setOpen] = useState(false);

  if (!ready) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">⚙️ Your van &amp; rates</span>
          {isCustom ? (
            <span className="chip bg-emerald-500/15 text-emerald-200">Personalised</span>
          ) : (
            <span className="chip bg-white/5 text-slate-400">Using UK defaults</span>
          )}
        </div>
        <span className="text-xs text-slate-400">
          {settings.mpg} mpg · £{settings.fuelPpl.toFixed(2)}/L · £{settings.minHourlyRate}/h {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="border-t border-white/10 p-4">
          <p className="mb-3 text-xs text-slate-400">
            Tune these to match your van and target earnings. Every profit and £/hour estimate on Pickup Radar updates
            instantly. Saved on this device.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Van economy (mpg)"
              hint="Miles per gallon"
              value={settings.mpg}
              min={8}
              max={80}
              step={1}
              onChange={(v) => update({ mpg: v })}
            />
            <Field
              label="Diesel price (£/L)"
              hint="Your pump price"
              value={settings.fuelPpl}
              min={0.5}
              max={4}
              step={0.01}
              onChange={(v) => update({ fuelPpl: v })}
            />
            <Field
              label="Min rate (£/hour)"
              hint="Your target earnings"
              value={settings.minHourlyRate}
              min={0}
              max={200}
              step={1}
              onChange={(v) => update({ minHourlyRate: v })}
            />
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={settings.includeReturnLeg}
              onChange={(e) => update({ includeReturnLeg: e.target.checked })}
              className="h-4 w-4 rounded border-white/20 bg-ink-900"
            />
            Include empty return leg (doubles fuel &amp; time — realistic if you drive home empty)
          </label>

          {isCustom && (
            <button onClick={reset} className="mt-4 text-xs text-slate-500 hover:text-red-300">
              Reset to UK defaults
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-300">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = Number.parseFloat(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
        className="mt-1 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white outline-none focus:border-brand-400"
      />
      <span className="mt-0.5 block text-[10px] text-slate-500">{hint}</span>
    </label>
  );
}
