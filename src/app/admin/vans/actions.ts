"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/requireAdmin";
import { prisma } from "@/lib/db";

export async function cancelEmptyVan(id: string) {
  const gate = await requireAdminAction();
  if ("error" in gate) return gate;

  await prisma.emptyVan.update({
    where: { id },
    data: { status: "cancelled" },
  });

  revalidatePath("/admin/vans");
  revalidatePath("/admin");
  return { ok: true };
}

export async function expireStaleVans() {
  const gate = await requireAdminAction();
  if ("error" in gate) return gate;

  const now = new Date();
  const res = await prisma.emptyVan.updateMany({
    where: { status: "active", availableUntil: { lt: now } },
    data: { status: "expired" },
  });

  revalidatePath("/admin/vans");
  revalidatePath("/admin");
  return { ok: true, updated: res.count };
}
