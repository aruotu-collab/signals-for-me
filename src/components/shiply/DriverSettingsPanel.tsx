"use client";

import Link from "next/link";
import { useState } from "react";
import { useDriverSettings } from "@/lib/shiply/driverSettings";

export function DriverSettingsPanel({ standalone = false }: { standalone?: boolean }) {
  const { settings, update, reset, ready, isCustom, signedIn } = useDriverSettings();
  const [open, setOpen] = useState(standalone);

  if (!ready) return null;

  const form = (
    <div className={standalone ? "" : "border-t border-white/10 p-4"}>
      <p className="mb-3 text-xs text-slate-400">
        Tune these to match your van and target earnings. Profit and £/hour estimates update instantly.
        {signedIn ? " Synced to your account across devices." : " Saved on this device — sign in to sync everywhere."}
      </p>

      {!signedIn && isCustom && (
        <div className="mb-3 rounded-lg border border-brand-500/20 bg-brand-500/5 px-3 py-2 text-xs text-slate-300">
          <Link href="/login" className="font-medium text-brand-300 underline">
            Sign in
          </Link>{" "}
          to keep your van profile on phone, tablet and laptop.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Van economy (mpg)"
          hint="Loaded LWB diesel — UK default 24"
          value={settings.mpg}
          min={8}
          max={80}
          step={1}
          onChange={(v) => update({ mpg: v })}
        />
        <Field
          label="Diesel price (£/L)"
          hint="Pump price — UK default £1.52/L"
          value={settings.fuelPpl}
          min={0.5}
          max={4}
          step={0.01}
          onChange={(v) => update({ fuelPpl: v })}
        />
        <Field
          label="Min profit (£/hour)"
          hint="Your target take-home rate"
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
        Include empty return leg (doubles fuel &amp; time if you drive home empty)
      </label>

      <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={settings.onlyWorthIt}
          onChange={(e) => update({ onlyWorthIt: e.target.checked })}
          className="h-4 w-4 rounded border-white/20 bg-ink-900"
        />
        Only show jobs meeting my £{settings.minHourlyRate}/hour profit minimum
      </label>

      {isCustom && (
        <button onClick={reset} className="mt-4 text-xs text-slate-500 hover:text-red-300">
          Reset to UK defaults
        </button>
      )}
    </div>
  );

  if (standalone) {
    return <div className="card p-5">{form}</div>;
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-white">⚙️ Your van &amp; rates</span>
          {isCustom ? (
            <span className="chip bg-emerald-500/15 text-emerald-200">Personalised</span>
          ) : (
            <span className="chip bg-white/5 text-slate-400">UK defaults</span>
          )}
          {settings.onlyWorthIt && (
            <span className="chip bg-brand-500/15 text-brand-200">Worth-it filter on</span>
          )}
        </div>
        <span className="shrink-0 text-xs text-slate-400">
          {settings.mpg} mpg · £{settings.fuelPpl.toFixed(2)}/L · £{settings.minHourlyRate}/h {open ? "▲" : "▼"}
        </span>
      </button>

      {open && form}
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
