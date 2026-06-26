"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";

async function requireAdmin() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !isAdminEmail(email)) {
    return { error: "Unauthorized." };
  }
  return { email };
}

export async function updateServiceRequestStatus(id: string, status: string) {
  const gate = await requireAdmin();
  if (gate.error) return gate;

  const allowed = ["new", "called", "fulfilled", "spam"];
  if (!allowed.includes(status)) return { error: "Invalid status." };

  await prisma.serviceRequest.update({
    where: { id },
    data: { status },
  });

  revalidatePath("/admin/leads");
  return { ok: true };
}
