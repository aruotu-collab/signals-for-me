import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";
import { IntentManager } from "./IntentManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Intent Campaigns", robots: { index: false, follow: false } };

export default async function AdminIntentsPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/login?callbackUrl=/admin/intents");
  if (!isAdminEmail(email)) notFound();

  const [rows, total, published] = await Promise.all([
    prisma.intentCampaign.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        slug: true,
        h1: true,
        serviceName: true,
        status: true,
        intentGroup: true,
        category: true,
        demandIdeaId: true,
      },
    }),
    prisma.intentCampaign.count(),
    prisma.intentCampaign.count({ where: { status: "published" } }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-slate-400 hover:text-white">
          ← Admin
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Intent campaign manager</h1>
        <p className="text-sm text-slate-400">
          Generate SEO intent pages from the 1,000-idea catalog. Service × modifier pages with call + vote CTAs.
        </p>
      </div>

      <IntentManager initialRows={rows} total={total} published={published} />
    </div>
  );
}
