"use server";

import { revalidatePath } from "next/cache";
import { acceptDriverBid, confirmPurchase, createQuoteRequest, submitDriverBid } from "@/lib/ebay/quotes";
import type { DeliveryEstimateResult } from "@/lib/ebay/estimate";

export async function requestDriverQuotes(formData: FormData) {
  const ebayUrl = String(formData.get("ebayUrl") ?? "").trim();
  const deliveryPostcode = String(formData.get("deliveryPostcode") ?? "").trim();
  const buyerEmail = String(formData.get("buyerEmail") ?? "").trim() || null;
  const buyerPhone = String(formData.get("buyerPhone") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const maxItemPriceRaw = Number.parseInt(String(formData.get("maxItemPrice") ?? ""), 10);
  const maxItemPrice = Number.isFinite(maxItemPriceRaw) && maxItemPriceRaw > 0 ? maxItemPriceRaw : null;

  const estimateJson = String(formData.get("estimate") ?? "");
  let estimate: DeliveryEstimateResult | null = null;
  try {
    estimate = estimateJson ? (JSON.parse(estimateJson) as DeliveryEstimateResult) : null;
  } catch {
    return { error: "Invalid estimate data. Please get an estimate first." };
  }

  if (!ebayUrl || !deliveryPostcode) return { error: "eBay URL and delivery postcode are required." };
  if (!buyerEmail && !buyerPhone) return { error: "Enter an email or phone so drivers can reach you." };
  if (!estimate?.distanceMiles) return { error: "Get a delivery estimate first (distance required)." };

  const req = await createQuoteRequest({
    ebayUrl,
    ebayItemId: estimate.itemId,
    itemTitle: estimate.itemTitle,
    imageUrl: estimate.imageUrl,
    buyingType: estimate.buyingType,
    pickupPostcode: estimate.pickupPostcode,
    pickupHub: estimate.pickupHub,
    pickupTown: estimate.pickupTown,
    deliveryPostcode,
    deliveryOutcode: estimate.deliveryArea,
    distanceMiles: estimate.distanceMiles,
    estimateLow: estimate.estimateLow,
    estimateHigh: estimate.estimateHigh,
    auctionEndsAt: estimate.auctionEndsAt,
    maxItemPrice,
    buyerEmail,
    buyerPhone,
    notes,
  });

  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/quote/${req.publicToken}`);

  return { ok: true, token: req.publicToken };
}

export async function placeDriverBid(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  const driverPhone = String(formData.get("driverPhone") ?? "").trim();
  const amount = Number.parseInt(String(formData.get("amount") ?? ""), 10);
  const driverName = String(formData.get("driverName") ?? "").trim() || undefined;
  const driverEmail = String(formData.get("driverEmail") ?? "").trim() || undefined;
  const message = String(formData.get("message") ?? "").trim() || undefined;
  const etaNotes = String(formData.get("etaNotes") ?? "").trim() || undefined;

  if (!requestId || !driverPhone) return { error: "Phone number is required." };
  if (!Number.isFinite(amount) || amount < 1) return { error: "Enter a valid quote amount in £." };

  try {
    await submitDriverBid({ requestId, driverPhone, amount, driverName, driverEmail, message, etaNotes });
    revalidatePath("/opportunities");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not submit bid." };
  }
}

export async function acceptBid(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const bidId = String(formData.get("bidId") ?? "");
  if (!token || !bidId) return { error: "Missing bid." };

  try {
    await acceptDriverBid(bidId, token);
    revalidatePath(`/opportunities/quote/${token}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not accept bid." };
  }
}

export async function confirmPurchaseAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!token) return { error: "Missing request." };

  try {
    await confirmPurchase(token);
    revalidatePath(`/opportunities/quote/${token}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not confirm purchase." };
  }
}
