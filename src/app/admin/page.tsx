import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const DAY = 86_400_000;

export default async function AdminPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/login?callbackUrl=/admin");
  if (!isAdminEmail(email)) notFound();

  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * DAY);
  const d30 = new Date(now.getTime() - 30 * DAY);

  let data: AdminData | null = null;
  let dbError = false;
  try {
    data = await loadData(d7, d30);
  } catch {
    dbError = true;
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin dashboard</h1>
          <p className="text-sm text-slate-400">Live user, subscriber & content metrics.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/catalog" className="btn-ghost px-4 py-2 text-sm">
            Catalog manager
          </Link>
          <Link href="/admin/intents" className="btn-ghost px-4 py-2 text-sm">
            Intent campaigns
          </Link>
        </div>
        <span className="text-xs text-slate-500">Signed in as {email}</span>
      </header>

      {dbError || !data ? (
        <div className="card p-6 text-sm text-slate-300">
          Couldn&apos;t load metrics — the database may be unreachable. Try again shortly.
        </div>
      ) : (
        <Dashboard data={data} />
      )}
    </div>
  );
}

function Dashboard({ data }: { data: AdminData }) {
  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Metric label="Total users" value={data.totalUsers} />
        <Metric label="New · 7 days" value={data.new7d} />
        <Metric label="New · 30 days" value={data.new30d} />
        <Metric label="Subscribers" value={data.subscribers} hint="have ≥1 interest" />
        <Metric label="Onboarding incomplete" value={data.onboardingIncomplete} hint="no interests yet" />
        <Metric label="Digest opt-ins" value={data.digestOptIn} />
        <Metric label="Digest opt-outs" value={data.digestOptOut} />
        <Metric label="Signals" value={data.signals} />
        <Metric label="Opportunities" value={data.opportunities} />
        <Metric label="Risks" value={data.risks} />
        <Metric label="Engagement events" value={data.events} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Top interests">
          <BreakdownList rows={data.topInterests} emptyLabel="No subscriptions yet." />
        </Panel>
        <Panel title="Audience split">
          <BreakdownList rows={data.audienceSplit} emptyLabel="No users yet." />
        </Panel>
        <Panel title="Plan split">
          <BreakdownList rows={data.planSplit} emptyLabel="No users yet." />
        </Panel>
        <Panel title="Recent sign-ups">
          {data.recentUsers.length === 0 ? (
            <p className="text-sm text-slate-400">No sign-ups yet.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {data.recentUsers.map((u) => (
                <div key={u.email} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-slate-200">{u.email}</span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {u.interests} interest{u.interests === 1 ? "" : "s"} · {fmtDate(u.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Recent engagement">
        {data.recentEvents.length === 0 ? (
          <p className="text-sm text-slate-400">No engagement events yet.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {data.recentEvents.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate text-slate-200">
                  <span className="mr-2 rounded bg-white/5 px-1.5 py-0.5 text-xs uppercase text-slate-300">
                    {e.kind}
                  </span>
                  {e.signalTitle}
                </span>
                <span className="shrink-0 text-xs text-slate-500">
                  {e.userEmail ?? "anon"} · {fmtDate(e.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-bold text-white">{value.toLocaleString()}</div>
      <div className="mt-1 text-xs text-slate-400">{label}</div>
      {hint && <div className="text-[11px] text-slate-600">{hint}</div>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      {children}
    </div>
  );
}

function BreakdownList({ rows, emptyLabel }: { rows: Row[]; emptyLabel: string }) {
  if (rows.length === 0) return <p className="text-sm text-slate-400">{emptyLabel}</p>;
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-200">{r.label}</span>
            <span className="text-slate-400">{r.count.toLocaleString()}</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-signal-hiring"
              style={{ width: `${Math.round((r.count / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

interface Row {
  label: string;
  count: number;
}
interface AdminData {
  totalUsers: number;
  new7d: number;
  new30d: number;
  subscribers: number;
  onboardingIncomplete: number;
  digestOptIn: number;
  digestOptOut: number;
  signals: number;
  opportunities: number;
  risks: number;
  events: number;
  topInterests: Row[];
  audienceSplit: Row[];
  planSplit: Row[];
  recentUsers: { email: string; createdAt: Date; interests: number }[];
  recentEvents: {
    id: string;
    kind: string;
    signalTitle: string;
    userEmail: string | null;
    createdAt: Date;
  }[];
}

async function loadData(d7: Date, d30: Date): Promise<AdminData> {
  const [
    totalUsers,
    new7d,
    new30d,
    subscribers,
    digestOptOut,
    signals,
    opportunities,
    risks,
    events,
    interestGroups,
    audienceGroups,
    planGroups,
    recentUsersRaw,
    recentEventsRaw,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: d7 } } }),
    prisma.user.count({ where: { createdAt: { gte: d30 } } }),
    prisma.user.count({ where: { subscriptions: { some: {} } } }),
    prisma.user.count({ where: { digestOptOut: true } }),
    prisma.signal.count(),
    prisma.opportunity.count(),
    prisma.risk.count(),
    prisma.signalEvent.count(),
    prisma.subscription.groupBy({
      by: ["signalType"],
      _count: { _all: true },
      orderBy: { _count: { signalType: "desc" } },
      take: 8,
    }),
    prisma.user.groupBy({ by: ["audience"], _count: { _all: true } }),
    prisma.user.groupBy({ by: ["plan"], _count: { _all: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { email: true, createdAt: true, _count: { select: { subscriptions: true } } },
    }),
    prisma.signalEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        kind: true,
        createdAt: true,
        signal: { select: { title: true } },
        user: { select: { email: true } },
      },
    }),
  ]);

  return {
    totalUsers,
    new7d,
    new30d,
    subscribers,
    onboardingIncomplete: totalUsers - subscribers,
    digestOptIn: totalUsers - digestOptOut,
    digestOptOut,
    signals,
    opportunities,
    risks,
    events,
    topInterests: interestGroups.map((g) => ({
      label: g.signalType ?? "Any / all",
      count: g._count._all,
    })),
    audienceSplit: audienceGroups.map((g) => ({ label: g.audience, count: g._count._all })),
    planSplit: planGroups.map((g) => ({ label: g.plan, count: g._count._all })),
    recentUsers: recentUsersRaw.map((u) => ({
      email: u.email,
      createdAt: u.createdAt,
      interests: u._count.subscriptions,
    })),
    recentEvents: recentEventsRaw.map((e) => ({
      id: e.id,
      kind: e.kind,
      signalTitle: e.signal?.title ?? "(deleted signal)",
      userEmail: e.user?.email ?? null,
      createdAt: e.createdAt,
    })),
  };
}
