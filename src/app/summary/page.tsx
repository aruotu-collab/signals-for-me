import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { resolveBrief } from "@/lib/briefRequest";
import { Scoreboard } from "@/components/Scoreboard";
import { LensBoard } from "@/components/LensBoard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Opportunity summary",
  description:
    "Your executive opportunity scoreboard — net opportunity, expected value, money at risk and where it sits across your business lenses.",
};

type SP = {
  business?: string;
  location?: string;
  goal?: string;
  audience?: string;
};

export default async function SummaryPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();

  // Brand-new signed-in users set up first. redirect() throws by design.
  if (user && user.subscriptions.length === 0 && !user.businessType) {
    redirect("/onboarding");
  }

  const { business, location, btLabel, usingGenericDefault, fromProfile, result, board, lensGroups, ctxParams } =
    await resolveBrief(sp, user, { limit: 12 });

  const briefHref = `/brief${Object.keys(ctxParams).length ? `?${new URLSearchParams(ctxParams).toString()}` : ""}`;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Opportunity summary</h1>
          <p className="mt-1 text-sm text-slate-400">
            The executive view — your money this month, then where it sits across your lenses.
          </p>
        </div>
        <Link href={briefHref} className="btn-primary whitespace-nowrap text-sm">
          Work your lenses →
        </Link>
      </header>

      {usingGenericDefault && (
        <div className="mb-6 rounded-xl border border-signal-buying/30 bg-signal-buying/10 p-3 text-sm text-signal-buying">
          Showing <span className="font-medium">general estimates</span>.{" "}
          <Link href="/onboarding" className="underline hover:text-white">
            Complete your profile
          </Link>{" "}
          for revenue numbers tailored to your business.
        </div>
      )}

      {!result || !board ? (
        <div className="card p-6 text-sm text-slate-300">
          <p className="font-medium text-white">No summary yet.</p>
          <p className="mt-1 text-slate-400">
            Set your business type to see your scoreboard.{" "}
            <Link href="/brief" className="text-brand-300 underline hover:text-white">
              Open the workspace
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <Scoreboard board={board} businessLabel={btLabel} location={location} lensCount={lensGroups.length} />

          <LensBoard groups={lensGroups} base={ctxParams} heading="Where the money sits" />

          {fromProfile && (
            <p className="mb-6 -mt-2 text-xs text-slate-500">
              Auto-generated from your saved profile.{" "}
              <Link href="/onboarding" className="text-slate-300 underline hover:text-white">
                Edit your profile
              </Link>
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={briefHref} className="btn-ghost text-sm">
              Open the lens workspace →
            </Link>
            <Link href={`/areas?business=${encodeURIComponent(business)}`} className="btn-ghost text-sm">
              Top postcodes →
            </Link>
            <Link href="/shortlist" className="btn-ghost text-sm">
              Portfolio
            </Link>
          </div>

          <p className="mt-6 text-xs text-slate-600">
            Revenue figures are estimates based on public UK benchmarks (ONS household size, sector
            fee/value averages) and conservative capture-rate assumptions. They are indicative, not
            guarantees.
          </p>
        </>
      )}
    </div>
  );
}
