import type { Metadata } from "next";
import Link from "next/link";
import { buildBriefForIds } from "@/lib/brief";
import { getCurrentUser } from "@/lib/session";
import { savedSignalIds } from "@/lib/shortlist";
import { BUSINESS_TYPES, type GrowthGoal } from "@/lib/opportunity";
import { OpportunityTable } from "@/components/OpportunityTable";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Saved opportunities",
  robots: { index: false, follow: false },
};

const GOALS: GrowthGoal[] = ["leads", "revenue", "locations", "hiring", "partnerships"];

export default async function ShortlistPage() {
  const user = await getCurrentUser().catch(() => null);

  if (!user) {
    return (
      <div className="card mx-auto max-w-lg p-6 text-center">
        <h1 className="text-xl font-bold text-white">Saved opportunities</h1>
        <p className="mt-2 text-sm text-slate-400">
          Sign in to save opportunities and build your own comparison shortlist.
        </p>
        <Link href="/login?callbackUrl=/shortlist" className="btn-primary mt-4 inline-block px-5 py-2.5">
          Sign in
        </Link>
      </div>
    );
  }

  const ids = await savedSignalIds(user.id);
  const businessKey = (user.businessType || "generic").trim();
  const location = (user.location || "").trim();
  const goalRaw = (user.growthGoal || "").trim();
  const growthGoal = (GOALS as string[]).includes(goalRaw) ? (goalRaw as GrowthGoal) : undefined;
  const btLabel = BUSINESS_TYPES.find((b) => b.key === businessKey)?.label ?? "your business";

  const rows = ids.length ? await buildBriefForIds(ids, { businessTypeKey: businessKey, location, growthGoal }) : [];
  const compareBase: Record<string, string> = { business: businessKey };
  if (location) compareBase.location = location;
  if (growthGoal) compareBase.goal = growthGoal;
  const compareAll = `/compare?business=${encodeURIComponent(businessKey)}&ids=${rows.slice(0, 4).map((r) => r.signal.id).join(",")}`;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Saved opportunities</h1>
          <p className="mt-1 text-sm text-slate-400">
            Your shortlist for a {btLabel.toLowerCase()}{location ? ` in ${location}` : ""} — ranked by expected value.
          </p>
        </div>
        {rows.length >= 2 && (
          <Link href={compareAll} className="btn-ghost text-sm">
            Compare top {Math.min(rows.length, 4)} →
          </Link>
        )}
      </header>

      {rows.length === 0 ? (
        <div className="card p-6 text-sm text-slate-300">
          <p className="font-medium text-white">No saved opportunities yet.</p>
          <p className="mt-1 text-slate-400">
            Open any opportunity and choose <span className="text-slate-200">Save to compare</span>, or browse your{" "}
            <Link href="/brief" className="text-brand-300 underline hover:text-white">
              opportunities
            </Link>
            .
          </p>
        </div>
      ) : (
        <OpportunityTable items={rows} compareBase={compareBase} />
      )}
    </div>
  );
}
