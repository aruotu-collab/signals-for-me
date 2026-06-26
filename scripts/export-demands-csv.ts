/**
 * Export all platform demand ideas to CSV.
 * Usage: npx tsx scripts/export-demands-csv.ts
 * Optional: OUT=path/to/file.csv NEXT_PUBLIC_SITE_URL=https://signalsforme.com
 */
import { writeFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";
import { DEMAND_CATEGORIES } from "../src/lib/demandCategories";

const prisma = new PrismaClient();
const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://signalsforme.com").replace(/\/$/, "");
const OUT = resolve(process.cwd(), process.env.OUT ?? "demands-export.csv");

const categoryLabel = Object.fromEntries(DEMAND_CATEGORIES.map((c) => [c.key, c.label]));

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

async function main() {
  const ideas = await prisma.demandIdea.findMany({
    where: { source: "platform", status: "active" },
    orderBy: [{ category: "asc" }, { title: "asc" }],
    select: { id: true, title: true, description: true, category: true },
  });

  const header = ["CATEGORY", "PROBLEM", "SOLUTION", "The Web page link"].map(csvEscape).join(",");
  const rows = ideas.map((idea) =>
    [
      csvEscape(categoryLabel[idea.category] ?? idea.category),
      csvEscape(idea.title),
      csvEscape(idea.description),
      csvEscape(`${BASE}/ideas/${idea.id}`),
    ].join(",")
  );

  writeFileSync(OUT, [header, ...rows].join("\n"), "utf8");
  console.log(`Wrote ${ideas.length} rows to ${OUT}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
