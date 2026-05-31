import { redirect } from "next/navigation";
import { Filters } from "@/components/Filters";
import { SignalCard } from "@/components/SignalCard";
import { IngestButton } from "@/components/IngestButton";
import { querySignals, personalizedFeed } from "@/lib/signals";
import { groupedTaxonomy } from "@/lib/taxonomy";
import { getCurrentUser } from "@/lib/session";
import { getDemoUser } from "@/lib/demo";

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
  let needsOnboarding = false;
  let dbError = false;
  if (view === "me") {
    try {
      const me = await getCurrentUser();
      if (me) {
        needsOnboarding = me.subscriptions.length === 0;
        feedUserId = me.id;
        feedName = me.name?.trim() || me.email.split("@")[0];
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

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {personalized ? `Signals For ${feedName}` : "Signal Feed"}
          </h1>
          <p className="text-sm text-slate-400">
            {personalized
              ? "Personalized to your subscriptions, ranked by confidence + recency."
              : "Live opportunities detected across funding, hiring, government, careers, AI & more."}
          </p>
        </div>
        <IngestButton />
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
                    <SignalCard key={s.id} signal={s} />
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
