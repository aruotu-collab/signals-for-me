"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";
import { DEMAND_CATALOG } from "@/lib/catalog";
import { generateCampaignFromIdea } from "@/lib/intent/generate";

async function requireAdmin() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !isAdminEmail(email)) throw new Error("Unauthorized");
}

export async function syncIntentCampaignsFromCatalog() {
  await requireAdmin();

  const ideas = await prisma.demandIdea.findMany({
    where: { source: "platform", status: "active" },
    orderBy: { createdAt: "asc" },
  });

  const catalogByTitle = new Map(DEMAND_CATALOG.map((c) => [c.title, c]));
  const usedSlugs = new Set(
    (await prisma.intentCampaign.findMany({ select: { slug: true } })).map((c) => c.slug),
  );

  let created = 0;
  let updated = 0;

  for (const idea of ideas) {
    const catalog = catalogByTitle.get(idea.title) ?? {
      title: idea.title,
      description: idea.description,
      category: idea.category,
    };

    let gen = generateCampaignFromIdea(catalog);
    let slug = gen.slug;
    let n = 2;
    while (usedSlugs.has(slug)) {
      slug = `${gen.slug}-${n++}`;
    }
    usedSlugs.add(slug);
    gen = { ...gen, slug };

    const existing = await prisma.intentCampaign.findUnique({ where: { demandIdeaId: idea.id } });
    const data = {
      ...gen,
      status: "published" as const,
      demandIdeaId: idea.id,
    };

    if (existing) {
      await prisma.intentCampaign.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.intentCampaign.create({ data });
      created++;
    }
  }

  revalidatePath("/need");
  revalidatePath("/admin/intents");
  return { ok: true, created, updated, total: ideas.length };
}

export async function setIntentCampaignStatus(id: string, status: "draft" | "published") {
  await requireAdmin();
  await prisma.intentCampaign.update({ where: { id }, data: { status } });
  revalidatePath("/need");
  revalidatePath("/admin/intents");
  return { ok: true };
}

export async function publishAllIntentDrafts() {
  await requireAdmin();
  const result = await prisma.intentCampaign.updateMany({
    where: { status: "draft" },
    data: { status: "published" },
  });
  revalidatePath("/need");
  revalidatePath("/admin/intents");
  return { ok: true, count: result.count };
}
