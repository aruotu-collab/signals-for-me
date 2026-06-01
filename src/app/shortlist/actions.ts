"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// Shortlisting reuses the existing SignalEvent model (kind = "save") so users
// can pin opportunities to a comparison set without a schema migration.
export async function toggleSave(signalId: string): Promise<{ saved: boolean; needAuth?: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { saved: false, needAuth: true };

  const existing = await prisma.signalEvent.findFirst({
    where: { userId: user.id, signalId, kind: "save" },
  });

  if (existing) {
    await prisma.signalEvent.delete({ where: { id: existing.id } });
    revalidatePath("/shortlist");
    return { saved: false };
  }

  await prisma.signalEvent.create({ data: { userId: user.id, signalId, kind: "save" } });
  revalidatePath("/shortlist");
  return { saved: true };
}
