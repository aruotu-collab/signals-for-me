"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface GroupView {
  group: string;
  types: { key: string; label: string; category: string }[];
}

export function Filters({ groups }: { groups: GroupView[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const category = params.get("category") ?? "";
  const type = params.get("type") ?? "";
  const view = params.get("view") ?? "";
  const minConfidence = params.get("minConfidence") ?? "0.5";

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      if (key === "category") next.delete("type");
      router.push(`/feed?${next.toString()}`);
    },
    [params, router],
  );

  return (
    <aside className="card h-fit p-4 text-sm md:sticky md:top-20">
      <Section title="View">
        <Toggle active={view === "me"} onClick={() => setParam("view", view === "me" ? "" : "me")}>
          Signals for Nelson
        </Toggle>
        <p className="mt-1 text-xs text-slate-500">Personalized to saved subscriptions.</p>
      </Section>

      <Section title="Audience">
        <div className="flex gap-2">
          {["", "business", "consumer"].map((c) => (
            <Toggle key={c || "all"} active={category === c} onClick={() => setParam("category", c)}>
              {c === "" ? "All" : c[0].toUpperCase() + c.slice(1)}
            </Toggle>
          ))}
        </div>
      </Section>

      <Section title="Min confidence">
        <input
          type="range"
          min={0}
          max={0.95}
          step={0.05}
          value={Number(minConfidence)}
          onChange={(e) => setParam("minConfidence", e.target.value)}
          className="w-full accent-brand-500"
        />
        <div className="text-xs text-slate-400">{Math.round(Number(minConfidence) * 100)}%+</div>
      </Section>

      <Section title="Signal type">
        <button
          onClick={() => setParam("type", "")}
          className={`mb-2 block text-left text-xs ${type === "" ? "text-brand-300" : "text-slate-400 hover:text-white"}`}
        >
          All types
        </button>
        <div className="max-h-[24rem] space-y-3 overflow-y-auto pr-1">
          {groups.map((g) => (
            <div key={g.group}>
              <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">{g.group}</div>
              {g.types.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setParam("type", t.key)}
                  className={`block w-full rounded-md px-2 py-1 text-left text-xs ${
                    type === t.key ? "bg-brand-500/20 text-brand-200" : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </Section>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 border-b border-white/5 pb-4 last:border-0">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      {children}
    </div>
  );
}

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
        active ? "border-brand-400/50 bg-brand-500/20 text-brand-100" : "border-white/10 text-slate-300 hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}
