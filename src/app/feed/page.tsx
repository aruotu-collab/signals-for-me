import Link from "next/link";
import { redirect } from "next/navigation";
import { Filters } from "@/components/Filters";
import { SignalCard } from "@/components/SignalCard";
import { IngestButton } from "@/components/IngestButton";
import { querySignals, personalizedFeed } from "@/lib/signals";
import { groupedTaxonomy } from "@/lib/taxonomy";
import { getCurrentUser } from "@/lib/session";
import { getDemoUser } from "@/lib/demo";
import {
  getBusinessType,
  translate,
  type BusinessType,
  type GrowthGoal,
  type OpportunityResult,
} from "@/lib/opportunity";
import type { SignalDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function FeedPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const view = str(sp.view);
  const category = str(sp.category) as "business" | "consumer" | undefined;
  const type = str(sp.type);
  const q = str(sp.q);
  const minConfidence = sp.minConfidence ? Number(str(sp.minConfidence)) : 0.5;

  const groups = groupedTaxonomy(category);

  // Resolve the personalized-feed target up front. Signed-in users get their
  // own feed; anonymous visitors fall back to the demo "Signals for Nelson"
  // persona so the public showcase still works without an account.
  let feedUserId: string | null = null;
  let feedName = "you";
  let signedIn = false;
  let needsOnboarding = false;
  let dbError = false;
  let profileBt: BusinessType | null = null;
  let profileLocation = "";
  let profileGoal: GrowthGoal | undefined;
  if (view === "me") {
    try {
      const me = await getCurrentUser();
      if (me) {
        signedIn = true;
        needsOnboarding = me.subscriptions.length === 0;
        feedUserId = me.id;
        feedName = me.name?.trim() || me.email.split("@")[0];
        if (me.businessType) {
          profileBt = getBusinessType(me.businessType);
          profileLocation = me.location ?? "";
          profileGoal = (me.growthGoal as GrowthGoal | null) ?? undefined;
        }
      } else {
        // Anonymous visitors see the demo feed under a generic label.
        const demo = await getDemoUser();
        feedUserId = demo?.id ?? null;
        feedName = "You";
      }
    } catch (err) {
      console.error("Feed user lookup failed:", err);
      dbError = true;
    }
  }

  // Brand-new users have no saved interests yet → send them to onboarding.
  // `redirect()` throws by design, so it must run OUTSIDE any try/catch.
  if (needsOnboarding) redirect("/onboarding");

  let signals: Awaited<ReturnType<typeof querySignals>> = [];
  let personalized = false;
  if (!dbError) {
    try {
      if (view === "me" && feedUserId) {
        signals = await personalizedFeed(feedUserId);
        personalized = true;
      } else {
        signals = await querySignals({ category, type, q, minConfidence });
      }
    } catch (err) {
      console.error("Feed query failed:", err);
      dbError = true;
    }
  }

  // For profiled, signed-in users on their own feed, translate each signal into
  // a business-specific revenue opportunity shown on the card.
  const opportunityMode = personalized && profileBt !== null;
  function oppFor(s: SignalDTO): OpportunityResult | undefined {
    if (!profileBt) return undefined;
    const hay = `${s.title} ${s.summary} ${s.entityName ?? ""} ${s.entityLocation ?? ""} ${s.affectedIndustries.join(" ")}`.toLowerCase();
    const locTerms = profileLocation.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    const locationMatch = locTerms.some((t) => hay.includes(t));
    const industryMatch = profileBt.keywords.some((k) => hay.includes(k));
    return translate(s, profileBt, { location: profileLocation, growthGoal: profileGoal, locationMatch, industryMatch });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {opportunityMode
              ? `Opportunities For ${feedName}`
              : personalized
                ? `Signals For ${feedName}`
                : "Signal Feed"}
          </h1>
          <p className="text-sm text-slate-400">
            {opportunityMode
              ? "Each signal translated into a revenue opportunity for your business, with a recommended action."
              : personalized
                ? "Personalized to your subscriptions, ranked by confidence + recency."
                : "Live opportunities detected across funding, hiring, government, careers, AI & more."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {personalized && signedIn && (
            <Link href="/onboarding" className="btn-ghost text-sm">
              Edit interests
            </Link>
          )}
          <IngestButton />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
        <Filters groups={groups} />

        <section>
          {dbError ? (
            <div className="card p-10 text-center">
              <div className="text-lg font-semibold text-white">Database not connected</div>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                The app can&apos;t reach its database. Set a valid <span className="text-brand-300">DATABASE_URL</span> in
                your deployment environment, then run the schema push and seed. See <span className="text-brand-300">README.md</span>.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 text-sm text-slate-400">{signals.length} signals</div>
              {signals.length === 0 ? (
                <div className="card p-10 text-center text-slate-400">
                  No signals yet. Click <span className="text-brand-300">Scan for signals</span> to run the pipeline.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {signals.map((s) => (
                    <SignalCard key={s.id} signal={s} opportunity={oppFor(s)} />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
