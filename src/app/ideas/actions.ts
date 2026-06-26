"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import type { VoteKind } from "@/lib/demand";
import { hasCompleteLocation } from "@/lib/location";

function userLocationData(user: {
  postcode: string | null;
  postcodeDistrict: string | null;
  locationCountry: string | null;
  locationRegion: string | null;
  locationCity: string | null;
  locationArea: string | null;
}) {
  return {
    postcode: user.postcode,
    postcodeDistrict: user.postcodeDistrict,
    locationCountry: user.locationCountry,
    locationRegion: user.locationRegion,
    locationCity: user.locationCity,
    locationArea: user.locationArea,
  };
}

export async function castVote(input: {
  ideaId: string;
  kind: VoteKind;
  remove?: boolean;
  priceBand?: string;
  frequency?: string;
  urgency?: string;
}) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to vote." };
  if (!hasCompleteLocation(user)) {
    return { error: "Add your location before voting." };
  }

  const idea = await prisma.demandIdea.findUnique({ where: { id: input.ideaId } });
  if (!idea) return { error: "Idea not found." };

  const loc = userLocationData(user);

  if (input.remove) {
    await prisma.demandVote.deleteMany({
      where: { ideaId: input.ideaId, userId: user.id, kind: input.kind },
    });
  } else {
    const existing = await prisma.demandVote.findFirst({
      where: { ideaId: input.ideaId, userId: user.id, kind: input.kind },
    });
    if (!existing) {
      await prisma.demandVote.create({
        data: {
          ideaId: input.ideaId,
          userId: user.id,
          kind: input.kind,
          priceBand: input.priceBand,
          frequency: input.frequency,
          urgency: input.urgency,
          ...loc,
        },
      });
    } else if (input.priceBand || input.frequency || input.urgency) {
      await prisma.demandVote.update({
        where: { id: existing.id },
        data: {
          priceBand: input.priceBand ?? existing.priceBand,
          frequency: input.frequency ?? existing.frequency,
          urgency: input.urgency ?? existing.urgency,
        },
      });
    }
  }

  revalidatePath("/ideas");
  revalidatePath(`/ideas/${input.ideaId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function addComment(input: { ideaId: string; body: string }) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to comment." };
  if (input.body.length < 3 || input.body.length > 1000) return { error: "Comment must be 3–1000 characters." };

  await prisma.demandComment.create({
    data: { ideaId: input.ideaId, userId: user.id, body: input.body },
  });

  revalidatePath(`/ideas/${input.ideaId}`);
  return { ok: true };
}

export async function submitIdea(formData: FormData) {
  const user = await getCurrentUser();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "other");
  const location = String(formData.get("location") ?? "").trim() || null;

  if (title.length < 5 || title.length > 120) return { error: "Title must be 5–120 characters." };
  if (description.length < 20 || description.length > 2000) return { error: "Description must be 20–2000 characters." };

  const idea = await prisma.demandIdea.create({
    data: {
      title,
      description,
      category,
      location,
      source: "user",
      createdById: user?.id,
    },
  });

  revalidatePath("/ideas");
  revalidatePath("/dashboard");
  return { ok: true, id: idea.id };
}
