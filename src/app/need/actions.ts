"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hasCompleteLocation, type UserLocation } from "@/lib/location";
import { resolveCallPhone, type ServiceUrgency } from "@/lib/serviceRequest";
import { formatAreaDisplay } from "@/lib/location";

function normalizePhone(raw: string): string {
  return raw.replace(/[^\d+]/g, "").trim();
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export async function submitServiceRequest(input: {
  serviceName: string;
  slug?: string;
  intentCampaignId?: string;
  urgency: ServiceUrgency;
  details?: string;
  contactPhone: string;
  contactName?: string;
  location: UserLocation;
}) {
  const serviceName = input.serviceName?.trim();
  if (!serviceName || serviceName.length < 3) {
    return { error: "Please describe the service you need." };
  }

  if (!hasCompleteLocation(input.location)) {
    return { error: "Select your country, region, and town/area." };
  }

  const phone = normalizePhone(input.contactPhone);
  if (!isValidPhone(phone)) {
    return { error: "Enter a valid phone number (10–15 digits)." };
  }

  const urgency = input.urgency;
  if (!["now", "today", "this_week"].includes(urgency)) {
    return { error: "Select how urgent this is." };
  }

  let campaignPhone: string | null = null;
  if (input.intentCampaignId) {
    const campaign = await prisma.intentCampaign.findUnique({
      where: { id: input.intentCampaignId },
      select: { callPhone: true, status: true },
    });
    if (campaign?.status === "published") {
      campaignPhone = campaign.callPhone;
    }
  }

  const callPhoneShown = resolveCallPhone(campaignPhone);

  const row = await prisma.serviceRequest.create({
    data: {
      intentCampaignId: input.intentCampaignId || null,
      serviceName,
      slug: input.slug || null,
      urgency,
      details: input.details?.trim() || null,
      contactPhone: phone,
      contactName: input.contactName?.trim() || null,
      locationCountry: input.location.locationCountry,
      locationRegion: input.location.locationRegion,
      locationCity: input.location.locationCity,
      locationArea: input.location.locationArea,
      callPhoneShown: callPhoneShown || null,
    },
  });

  revalidatePath("/admin/leads");
  revalidatePath("/dashboard");

  const areaDisplay = formatAreaDisplay(input.location);

  return {
    id: row.id,
    callPhone: callPhoneShown,
    areaDisplay,
    serviceName,
    urgency,
  };
}
