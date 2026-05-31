"use client";

import { useMemo, useState } from "react";
import { BUSINESS_TYPES, type GrowthGoal } from "@/lib/opportunity";

interface TypeDef {
  key: string;
  label: string;
  category: string;
  group: string;
}
interface GroupView {
  group: string;
  types: TypeDef[];
}

const GROWTH_GOALS: GrowthGoal[] = ["leads", "revenue", "locations", "hiring", "partnerships"];

export function OnboardingForm({
  action,
  groups,
  defaultAudience,
  initialSelected = [],
  initialKeyword = "",
  initialBusinessType = "",
  initialLocation = "",
  initialGoal = "",
  isEditing = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  groups: GroupView[];
  defaultAudience: "business" | "consumer";
  initialSelected?: string[];
  initialKeyword?: string;
  initialBusinessType?: string;
  initialLocation?: string;
  initialGoal?: string;
  isEditing?: boolean;
}) {
  const [audience, setAudience] = useState<"business" | "consumer" | "both">(defaultAudience);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));
  const [submitting, setSubmitting] = useState(false);

  const visibleGroups = useMemo(() => {
    if (audience === "both") return groups;
    return groups
      .map((g) => ({ ...g, types: g.types.filter((t) => t.category === audience) }))
      .filter((g) => g.types.length > 0);
  }, [groups, audience]);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <form action={action} onSubmit={() => setSubmitting(true)} className="mt-8 space-y-8">
      {/* hidden inputs carry the client state into the server action */}
      <input type="hidden" name="audience" value={audience === "both" ? "business" : audience} />
      {Array.from(selected).map((key) => (
        <input key={key} type="hidden" name="types" value={key} />
      ))}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">I am here as a…</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {([
            ["business", "Business — find leads & opportunities"],
            ["consumer", "Consumer — find deals, jobs & trends"],
            ["both", "Both"],
          ] as const).map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => setAudience(value)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                audience === value
                  ? "border-brand-400/50 bg-brand-500/20 text-brand-100"
                  : "border-white/10 text-slate-300 hover:bg-white/5"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          About your business <span className="text-slate-600">(optional — powers revenue estimates)</span>
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">Business type</span>
            <select name="businessType" defaultValue={initialBusinessType} className={profileInputCls}>
              <option value="">Not set</option>
              {BUSINESS_TYPES.filter((b) => b.key !== "generic").map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">Location</span>
            <input
              name="location"
              defaultValue={initialLocation}
              placeholder="e.g. Catford, SE6"
              className={profileInputCls}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">Main goal</span>
            <select name="goal" defaultValue={initialGoal} className={profileInputCls}>
              <option value="">Any</option>
              {GROWTH_GOALS.map((g) => (
                <option key={g} value={g}>
                  {g[0].toUpperCase() + g.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Set this and your feed shows each signal as a revenue opportunity with a recommended action.
        </p>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Signals to track
          </h2>
          <span className="text-xs text-slate-500">{selected.size} selected</span>
        </div>
        <div className="mt-3 space-y-5">
          {visibleGroups.map((g) => (
            <div key={g.group}>
              <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">{g.group}</div>
              <div className="flex flex-wrap gap-2">
                {g.types.map((t) => {
                  const on = selected.has(t.key);
                  return (
                    <button
                      type="button"
                      key={t.key}
                      onClick={() => toggle(t.key)}
                      aria-pressed={on}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        on
                          ? "border-brand-400/50 bg-brand-500/20 text-brand-100"
                          : "border-white/10 text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Optional keyword
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Narrow to a sector, location or company — e.g. &quot;fintech&quot;, &quot;Manchester&quot;, &quot;remote&quot;.
        </p>
        <input
          type="text"
          name="keyword"
          defaultValue={initialKeyword}
          placeholder="Add a keyword (optional)"
          className="mt-3 w-full max-w-sm rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-brand-400/50 focus:outline-none"
        />
      </section>

      <input type="hidden" name="minConfidence" value="0.5" />

      <div className="flex items-center gap-3 border-t border-white/10 pt-6">
        <button
          type="submit"
          disabled={submitting || selected.size === 0}
          className="btn-primary px-5 py-2.5 disabled:opacity-50"
        >
          {submitting
            ? "Saving…"
            : isEditing
              ? "Save changes"
              : "Build my feed"}
        </button>
        <span className="text-xs text-slate-500">
          {selected.size === 0
            ? "Pick at least one signal to continue."
            : isEditing
              ? "Changes apply right away."
              : "You can refine these anytime from your feed."}
        </span>
      </div>
    </form>
  );
}

const profileInputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-brand-400/50 focus:outline-none";
