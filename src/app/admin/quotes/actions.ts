"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/requireAdmin";
import { prisma } from "@/lib/db";

const QUOTE_STATUSES = ["open", "awarded", "won", "closed", "expired"] as const;

export async function updateQuoteStatus(id: string, status: string) {
  const gate = await requireAdminAction();
  if ("error" in gate) return gate;
  if (!QUOTE_STATUSES.includes(status as (typeof QUOTE_STATUSES)[number])) {
    return { error: "Invalid status." };
  }

  await prisma.deliveryQuoteRequest.update({
    where: { id },
    data: { status },
  });

  revalidatePath("/admin/quotes");
  revalidatePath("/admin");
  return { ok: true };
}

export async function declineAllPendingBids(requestId: string) {
  const gate = await requireAdminAction();
  if ("error" in gate) return gate;

  await prisma.driverQuoteBid.updateMany({
    where: { requestId, status: "pending" },
    data: { status: "declined" },
  });

  revalidatePath("/admin/quotes");
  return { ok: true };
}
