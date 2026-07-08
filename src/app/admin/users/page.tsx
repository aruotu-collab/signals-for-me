import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Users", robots: { index: false, follow: false } };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const where = query
    ? {
        OR: [
          { email: { contains: query, mode: "insensitive" as const } },
          { name: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [total, rows, planGroups, audienceGroups] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        email: true,
        name: true,
        audience: true,
        plan: true,
        digestOptOut: true,
        createdAt: true,
        emailVerified: true,
        _count: { select: { subscriptions: true, savedJobs: true, events: true } },
        driverProfile: { select: { id: true } },
      },
    }),
    prisma.user.groupBy({ by: ["plan"], _count: { _all: true } }),
    prisma.user.groupBy({ by: ["audience"], _count: { _all: true } }),
  ]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-sm text-slate-400">
          Registered accounts — magic-link auth, driver profiles, and saved jobs.
        </p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total users" value={total} />
        {planGroups.map((g) => (
          <Stat key={g.plan} label={`Plan: ${g.plan}`} value={g._count._all} />
        ))}
        {audienceGroups.map((g) => (
          <Stat key={g.audience} label={`Audience: ${g.audience}`} value={g._count._all} />
        ))}
      </div>

      <form className="mb-6 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search email or name…"
          className="min-w-[220px] flex-1 rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-200"
        />
        <button type="submit" className="btn-primary px-4 py-2 text-sm">
          Search
        </button>
        {query && (
          <Link href="/admin/users" className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white">
            Clear
          </Link>
        )}
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase text-slate-500">
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Audience</th>
              <th className="px-4 py-3">Interests</th>
              <th className="px-4 py-3">Saved jobs</th>
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Digest</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  No users found.
                </td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} className="text-slate-300">
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {u.createdAt.toLocaleDateString("en-GB")}
                    {!u.emailVerified && <div className="text-amber-400">unverified</div>}
                  </td>
                  <td className="px-4 py-3 font-medium text-white">{u.email}</td>
                  <td className="px-4 py-3">{u.name ?? "—"}</td>
                  <td className="px-4 py-3 text-xs uppercase">{u.plan}</td>
                  <td className="px-4 py-3 text-xs">{u.audience}</td>
                  <td className="px-4 py-3">{u._count.subscriptions}</td>
                  <td className="px-4 py-3">{u._count.savedJobs}</td>
                  <td className="px-4 py-3">{u.driverProfile ? "Yes" : "—"}</td>
                  <td className="px-4 py-3 text-xs">{u.digestOptOut ? "Off" : "On"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-500">Showing up to 100 users{query ? ` matching “${query}”` : ""}.</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-bold text-white">{value.toLocaleString()}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}
