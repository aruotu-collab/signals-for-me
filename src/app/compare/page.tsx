import type { Metadata } from "next";
import Link from "next/link";
import { buildBriefForIds } from "@/lib/brief";
import { getCurrentUser } from "@/lib/session";
import { BUSINESS_TYPES, type GrowthGoal } from "@/lib/opportunity";
import { ComparisonGrid } from "@/components/ComparisonGrid";

export const dynamic = "force-dynamic";
// Comparisons are hand-picked and user-specific — not useful to index.
export const metadata: Metadata = {
  title: "Compare opportunities",
  robots: { index: false, follow: false },
};

type SP = { ids?: string; business?: string; location?: string; goal?: string };

const GOALS: GrowthGoal[] = ["leads", "revenue", "locations", "hiring", "partnerships"];

export default async function ComparePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await getCurrentUser().catch(() => null);

  const ids = (sp.ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  const businessKey = (sp.business || user?.businessType || "generic").trim();
  const location = (sp.location || user?.location || "").trim();
  const goalRaw = (sp.goal || user?.growthGoal || "").trim();
  const growthGoal = (GOALS as string[]).includes(goalRaw) ? (goalRaw as GrowthGoal) : undefined;
  const btLabel = BUSINESS_TYPES.find((b) => b.key === businessKey)?.label ?? "your business";

  const rows = ids.length ? await buildBriefForIds(ids, { businessTypeKey: businessKey, location, growthGoal }) : [];

  return (
    <div>
      <Link href="/brief" className="text-sm text-slate-400 hover:text-white">
        ← Back to opportunities
      </Link>

      <header className="mb-6 mt-3">
        <h1 className="text-2xl font-bold text-white">Compare opportunities</h1>
        <p className="mt-1 text-sm text-slate-400">
          {rows.length > 1
            ? `Head-to-head for a ${btLabel.toLowerCase()}${location ? ` in ${location}` : ""}. The best expected value is flagged.`
            : "Pick two or more opportunities from your brief to compare them side by side."}
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="card p-6 text-sm text-slate-300">
          <p className="font-medium text-white">No opportunities selected.</p>
          <p className="mt-1 text-slate-400">
            Go to your{" "}
            <Link href="/brief" className="text-brand-300 underline hover:text-white">
              opportunities
            </Link>
            , tick the rows you want to weigh up, then choose <span className="text-slate-200">Compare</span>.
          </p>
        </div>
      ) : rows.length === 1 ? (
        <div className="card p-6 text-sm text-slate-300">
          <p className="font-medium text-white">Only one opportunity selected.</p>
          <p className="mt-1 text-slate-400">
            Select at least two on your{" "}
            <Link href="/brief" className="text-brand-300 underline hover:text-white">
              opportunities
            </Link>{" "}
            page to compare them.
          </p>
        </div>
      ) : (
        <>
          <ComparisonGrid rows={rows} />
          <p className="mt-6 text-xs text-slate-600">
            Expected value is the confidence-weighted midpoint of the revenue range (negative when it
            represents revenue at risk). Figures are indicative estimates from public UK benchmarks and
            the assumptions shown — not guarantees.
          </p>
        </>
      )}
    </div>
  );
}
