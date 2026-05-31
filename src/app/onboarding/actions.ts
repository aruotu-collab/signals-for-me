"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getSignalType } from "@/lib/taxonomy";

// Persists a new user's chosen interests as Subscriptions, then sends them to
// their personalized feed. Replaces any existing subscriptions so re-running
// onboarding is idempotent.
export async function saveOnboarding(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/onboarding");

  const audienceRaw = String(formData.get("audience") || "business");
  const audience: "business" | "consumer" =
    audienceRaw === "consumer" ? "consumer" : "business";

  const types = formData.getAll("types").map(String).filter(Boolean);
  const keyword = String(formData.get("keyword") || "").trim();
  const minConfidence = Number(formData.get("minConfidence") || 0.5);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { audience } });
    await tx.subscription.deleteMany({ where: { userId: user.id } });

    const data = types.map((key) => {
      const def = getSignalType(key);
      return {
        userId: user.id,
        category: def?.category ?? null,
        signalType: key,
        keyword: keyword || null,
        minConfidence: Number.isFinite(minConfidence) ? minConfidence : 0.5,
      };
    });

    // If they gave a keyword but picked no types, still save a broad keyword sub.
    if (data.length === 0 && keyword) {
      data.push({
        userId: user.id,
        category: audienceRaw === "consumer" ? "consumer" : "business",
        signalType: null as unknown as string,
        keyword,
        minConfidence: 0.5,
      });
    }

    if (data.length > 0) {
      await tx.subscription.createMany({ data });
    }
  });

  redirect("/feed?view=me");
}
