import Link from "next/link";
import { formatGBP, formatGBPSigned } from "@/lib/opportunity";
import type { LensGroup } from "@/lib/scoreboard";

// The Lens Board: the spine of the lens-driven dashboard. Each card is one of
// the business's opportunity lenses, sized by the money inside it. Clicking a
// lens drills the table below into just that bucket.
export function LensBoard({
  groups,
  base,
  activeKey,
  interactive = true,
  heading = "Your opportunity lenses",
}: {
  groups: LensGroup[];
  /** brief context (business/location/goal/sort/view) carried through links */
  base?: Record<string, string>;
  /** the lens currently being drilled into, if any */
  activeKey?: string;
  /** when false, cards are static (e.g. the portfolio summary) */
  interactive?: boolean;
  heading?: string;
}) {
  if (groups.length === 0) return null;

  const qs = new URLSearchParams(base ?? {}).toString();
  // A lens card opens its own dedicated page; "All lenses" returns to the board.
  const hrefFor = (kind?: string) =>
    kind ? `/lens/${kind}${qs ? `?${qs}` : ""}` : `/brief${qs ? `?${qs}` : ""}`;

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{heading}</h2>
        {interactive &&
          (activeKey ? (
            <Link href={hrefFor()} className="text-xs text-brand-300 hover:text-brand-200 hover:underline">
              ← All lenses
            </Link>
          ) : (
            <span className="text-xs text-slate-500">Tap a lens to drill in</span>
          ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => {
          const active = g.key === activeKey;
          const tone = g.defensive ? "text-signal-distress" : "text-signal-growth";
          const ring = active
            ? "border-brand-400/60 bg-brand-500/10 ring-1 ring-brand-400/40"
            : g.defensive
              ? "border-signal-distress/25"
              : "border-white/10";
          const hover = interactive
            ? g.defensive
              ? "hover:border-signal-distress/50"
              : "hover:border-brand-400/40"
            : "";

          const body = (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold text-white" title={g.label}>
                  {g.label}
                </span>
                <span className="shrink-0 text-[11px] uppercase tracking-wide text-slate-500">
                  {g.count} live
                </span>
              </div>

              <div className={`mt-2 text-2xl font-bold ${tone}`}>
                {formatGBPSigned(g.expectedValue)}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">
                {g.defensive ? "revenue at risk" : "expected value"}
                {g.topRoi > 0 ? ` · up to ${g.topRoi}x ROI` : ""}
              </div>

              {g.top && (
                <p className="mt-2 line-clamp-2 text-xs text-slate-400" title={g.top.signal.title}>
                  Top: {g.top.signal.title}
                </p>
              )}

              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">
                  {formatGBP(g.valueLow)}–{formatGBP(g.valueHigh)}
                </span>
                {g.urgentCount > 0 && <span className="text-signal-buying">{g.urgentCount} urgent</span>}
              </div>
            </>
          );

          return interactive ? (
            <Link
              key={g.key}
              href={hrefFor(active ? undefined : g.key)}
              className={`card block border p-4 transition ${ring} ${hover}`}
            >
              {body}
            </Link>
          ) : (
            <div key={g.key} className={`card border p-4 ${ring}`}>
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
