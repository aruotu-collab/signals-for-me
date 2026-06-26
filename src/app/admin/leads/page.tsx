import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";
import { LeadsManager } from "./LeadsManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Service Leads", robots: { index: false, follow: false } };

export default async function AdminLeadsPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/login?callbackUrl=/admin/leads");
  if (!isAdminEmail(email)) notFound();

  const [rows, statusGroups] = await Promise.all([
    prisma.serviceRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.serviceRequest.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const counts: Record<string, number> = {};
  for (const g of statusGroups) {
    counts[g.status] = g._count._all;
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-slate-400 hover:text-white">
          ← Admin
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Service requests</h1>
        <p className="text-sm text-slate-400">
          Urgent help requests from /need pages. Phone numbers are revealed to users after they submit.
        </p>
      </div>

      <LeadsManager
        initialRows={rows.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        }))}
        counts={counts}
      />
    </div>
  );
}
