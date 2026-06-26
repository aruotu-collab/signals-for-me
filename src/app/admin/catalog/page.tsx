import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";
import { AdminNav } from "@/components/AdminNav";
import { DEMAND_CATEGORIES } from "@/lib/demandCategories";
import { CatalogManager } from "./CatalogManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Catalog Manager", robots: { index: false, follow: false } };

export default async function AdminCatalogPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/login?callbackUrl=/admin/catalog");
  if (!isAdminEmail(email)) notFound();

  const [rows, total, byCategory] = await Promise.all([
    prisma.demandIdea.findMany({
      where: { source: "platform" },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        location: true,
        status: true,
        _count: { select: { votes: true, comments: true } },
      },
    }),
    prisma.demandIdea.count({ where: { source: "platform" } }),
    prisma.demandIdea.groupBy({
      by: ["category"],
      where: { source: "platform", status: "active" },
      _count: { _all: true },
    }),
  ]);

  return (
    <div>
      <AdminNav email={email} />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Catalog manager</h1>
          <p className="text-sm text-slate-400">
            Edit demand idea copy, export/import JSON, or sync the built-in 1,000-idea catalog.
          </p>
        </div>
        <div className="text-right text-sm text-slate-500">
          <div>{total.toLocaleString()} platform ideas</div>
          <div>{DEMAND_CATEGORIES.length} categories</div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {byCategory
          .sort((a, b) => b._count._all - a._count._all)
          .slice(0, 12)
          .map((c) => (
            <div key={c.category} className="card p-3 text-center text-xs">
              <div className="text-slate-400">{c.category}</div>
              <div className="text-lg font-bold text-white">{c._count._all}</div>
            </div>
          ))}
      </div>

      <CatalogManager initialRows={rows} />
    </div>
  );
}
