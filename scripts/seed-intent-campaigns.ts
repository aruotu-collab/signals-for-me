/**
 * Seed intent campaigns from platform demand ideas (run after catalog seed).
 * Usage: npx tsx scripts/seed-intent-campaigns.ts
 */
import { PrismaClient } from "@prisma/client";
import { DEMAND_CATALOG } from "../src/lib/catalog";
import { generateCampaignFromIdea } from "../src/lib/intent/generate";

const prisma = new PrismaClient();

async function main() {
  const ideas = await prisma.demandIdea.findMany({
    where: { source: "platform", status: "active" },
    orderBy: { createdAt: "asc" },
  });

  if (ideas.length === 0) {
    console.error("No platform demand ideas found. Run: SEED_DEMAND_CATALOG=1 npm run db:seed");
    process.exit(1);
  }

  const catalogByTitle = new Map(DEMAND_CATALOG.map((c) => [c.title, c]));
  const usedSlugs = new Set<string>();
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

    const existing = await prisma.intentCampaign.findUnique({
      where: { demandIdeaId: idea.id },
    });

    const data = {
      slug: gen.slug,
      status: "published",
      serviceName: gen.serviceName,
      modifierSlug: gen.modifierSlug,
      modifierLabel: gen.modifierLabel,
      locationSlug: gen.locationSlug,
      locationName: gen.locationName,
      category: gen.category,
      intentGroup: gen.intentGroup,
      intentLevel: gen.intentLevel,
      h1: gen.h1,
      whatIsThis: gen.whatIsThis,
      priceRange: gen.priceRange,
      howFast: gen.howFast,
      metaTitle: gen.metaTitle,
      metaDescription: gen.metaDescription,
      faqJson: gen.faqJson,
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

  console.log(`Intent campaigns: ${created} created, ${updated} updated (${ideas.length} total).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
