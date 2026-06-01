import { prisma } from "@/lib/db";

// Read helpers for the shortlist (SignalEvent kind = "save").

export async function savedSignalIds(userId: string): Promise<string[]> {
  const rows = await prisma.signalEvent.findMany({
    where: { userId, kind: "save" },
    orderBy: { createdAt: "desc" },
    select: { signalId: true },
  });
  // De-dupe while preserving most-recent-first order.
  return Array.from(new Set(rows.map((r) => r.signalId)));
}

export async function isSignalSaved(userId: string, signalId: string): Promise<boolean> {
  const row = await prisma.signalEvent.findFirst({
    where: { userId, signalId, kind: "save" },
    select: { id: true },
  });
  return Boolean(row);
}
