"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";
import { DEMAND_CATALOG } from "@/lib/catalog";

async function requireAdmin() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !isAdminEmail(email)) throw new Error("Unauthorized");
  return email;
}

export async function updateCatalogIdea(input: {
  id: string;
  title: string;
  description: string;
  category: string;
  location?: string | null;
  status?: string;
}) {
  await requireAdmin();
  if (input.title.length < 5 || input.description.length < 20) {
    return { error: "Title min 5 chars, description min 20 chars." };
  }
  await prisma.demandIdea.update({
    where: { id: input.id },
    data: {
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      location: input.location?.trim() || null,
      status: input.status ?? "active",
    },
  });
  revalidatePath("/admin/catalog");
  revalidatePath("/ideas");
  revalidatePath(`/ideas/${input.id}`);
  return { ok: true };
}

export async function exportCatalogJson() {
  await requireAdmin();
  const ideas = await prisma.demandIdea.findMany({
    where: { source: "platform" },
    orderBy: [{ category: "asc" }, { title: "asc" }],
    select: { title: true, description: true, category: true, location: true, status: true },
  });
  return JSON.stringify(ideas, null, 2);
}

export async function importCatalogJson(json: string, mode: "replace" | "merge") {
  await requireAdmin();
  let rows: { title: string; description: string; category: string; location?: string | null; status?: string }[];
  try {
    rows = JSON.parse(json);
    if (!Array.isArray(rows)) return { error: "JSON must be an array." };
  } catch {
    return { error: "Invalid JSON." };
  }

  if (mode === "replace") {
    await prisma.demandComment.deleteMany({ where: { idea: { source: "platform" } } });
    await prisma.demandVote.deleteMany({ where: { idea: { source: "platform" } } });
    await prisma.demandIdea.deleteMany({ where: { source: "platform" } });
  }

  let created = 0;
  for (const row of rows) {
    if (!row.title || !row.description || !row.category) continue;
    if (mode === "merge") {
      const existing = await prisma.demandIdea.findFirst({
        where: { title: row.title, category: row.category, source: "platform" },
      });
      if (existing) {
        await prisma.demandIdea.update({
          where: { id: existing.id },
          data: {
            description: row.description,
            location: row.location ?? null,
            status: row.status ?? "active",
          },
        });
        continue;
      }
    }
    await prisma.demandIdea.create({
      data: {
        title: row.title,
        description: row.description,
        category: row.category,
        location: row.location ?? "UK-wide",
        source: "platform",
        status: row.status ?? "active",
      },
    });
    created++;
  }

  revalidatePath("/admin/catalog");
  revalidatePath("/ideas");
  return { ok: true, created, total: rows.length };
}

export async function syncFromBuiltInCatalog() {
  await requireAdmin();
  await prisma.demandComment.deleteMany({ where: { idea: { source: "platform" } } });
  await prisma.demandVote.deleteMany({ where: { idea: { source: "platform" } } });
  await prisma.demandIdea.deleteMany({ where: { source: "platform" } });

  const BATCH = 100;
  for (let i = 0; i < DEMAND_CATALOG.length; i += BATCH) {
    await prisma.demandIdea.createMany({
      data: DEMAND_CATALOG.slice(i, i + BATCH).map((c) => ({
        title: c.title,
        description: c.description,
        category: c.category,
        location: c.location ?? "UK-wide",
        source: "platform",
      })),
    });
  }

  revalidatePath("/admin/catalog");
  revalidatePath("/ideas");
  return { ok: true, count: DEMAND_CATALOG.length };
}
