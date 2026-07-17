import { FLIP_CATEGORY_IDS } from "@/lib/flip/search";
import type { FlipCategoryName } from "@/lib/flip/types";
import { cleanListingTitle } from "@/lib/flip/relist";
import { fetchItemReference } from "@/lib/ebay/itemReference";
import { ebaySellFetch } from "@/lib/ebay/sellerAuth";

export type CreateDraftInput = {
  userId: string;
  sourceItemId: string;
  title?: string;
  description?: string;
  binPrice: number;
  category?: string;
  brand?: string | null;
};

export type CreateDraftResult = {
  sku: string;
  offerId: string | null;
  listingDraftUrl: string;
  inventoryOnly: boolean;
  message: string;
  referenceImageCount: number;
};

type PolicyList<T> = { fulfillmentPolicies?: T[]; paymentPolicies?: T[]; returnPolicies?: T[] };
type Policy = { fulfillmentPolicyId?: string; paymentPolicyId?: string; returnPolicyId?: string; name?: string };

function skuFor(itemId: string): string {
  const safe = itemId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 40);
  return `sfm-${safe}`.slice(0, 50);
}

function mapCondition(conditionId: string | null, condition: string | null): string {
  const id = conditionId ?? "";
  // Inventory API uses enum-like strings
  if (id === "1000") return "NEW";
  if (id === "1500") return "NEW_OTHER";
  if (id === "2000" || id === "2500") return "SELLER_REFURBISHED";
  if (id === "3000") return "USED_EXCELLENT";
  if (id === "4000") return "USED_VERY_GOOD";
  if (id === "5000") return "USED_GOOD";
  if (id === "6000") return "USED_ACCEPTABLE";
  const c = (condition ?? "").toLowerCase();
  if (c.includes("new")) return "NEW_OTHER";
  if (c.includes("refurbished")) return "SELLER_REFURBISHED";
  return "USED_GOOD";
}

async function firstPolicyIds(userId: string): Promise<{
  fulfillmentPolicyId: string | null;
  paymentPolicyId: string | null;
  returnPolicyId: string | null;
  merchantLocationKey: string | null;
}> {
  const [fulfillment, payment, returns, locations] = await Promise.all([
    ebaySellFetch<PolicyList<Policy>>(
      userId,
      `/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_GB`,
    ),
    ebaySellFetch<PolicyList<Policy>>(
      userId,
      `/sell/account/v1/payment_policy?marketplace_id=EBAY_GB`,
    ),
    ebaySellFetch<PolicyList<Policy>>(
      userId,
      `/sell/account/v1/return_policy?marketplace_id=EBAY_GB`,
    ),
    ebaySellFetch<{ locations?: { merchantLocationKey?: string }[] }>(
      userId,
      `/sell/inventory/v1/location?limit=20`,
    ),
  ]);

  return {
    fulfillmentPolicyId: fulfillment.data.fulfillmentPolicies?.[0]?.fulfillmentPolicyId ?? null,
    paymentPolicyId: payment.data.paymentPolicies?.[0]?.paymentPolicyId ?? null,
    returnPolicyId: returns.data.returnPolicies?.[0]?.returnPolicyId ?? null,
    merchantLocationKey: locations.data.locations?.[0]?.merchantLocationKey ?? null,
  };
}

/**
 * Creates an inventory item (+ unpublished offer when business policies exist).
 * Does not attach auction seller photos to the listing.
 */
export async function createEbayListingDraft(input: CreateDraftInput): Promise<CreateDraftResult> {
  const ref = await fetchItemReference(input.sourceItemId);
  const title = cleanListingTitle(input.title || ref?.title || "Flip Radar item");
  const description =
    input.description ||
    `${title}\n\nUsed — see photos for exact condition. Dispatched quickly with tracked UK postage.\n\nAdd your own photos before publishing.`;
  const binPrice = Math.max(1, Math.round(input.binPrice * 100) / 100);
  const categoryId =
    ref?.categoryId ||
    (input.category && input.category in FLIP_CATEGORY_IDS
      ? FLIP_CATEGORY_IDS[input.category as FlipCategoryName]
      : null) ||
    "99";

  const aspects: Record<string, string[]> = { ...(ref?.aspects ?? {}) };
  if (input.brand && !aspects.Brand) aspects.Brand = [input.brand];

  const sku = skuFor(ref?.legacyItemId || input.sourceItemId);
  const condition = mapCondition(ref?.conditionId ?? null, ref?.condition ?? null);

  const inventoryBody = {
    availability: {
      shipToLocationAvailability: { quantity: 1 },
    },
    condition,
    product: {
      title: title.slice(0, 80),
      description: description.slice(0, 500000),
      aspects,
      brand: input.brand || ref?.brand || undefined,
      // Intentionally omit imageUrls — auction photos belong to the original seller.
    },
  };

  const putInv = await ebaySellFetch<{ errors?: { message?: string }[] }>(
    input.userId,
    `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
    { method: "PUT", body: JSON.stringify(inventoryBody) },
  );

  if (!putInv.ok && putInv.status !== 204) {
    const msg =
      (putInv.data as { errors?: { message?: string }[] })?.errors?.[0]?.message ||
      `Failed to create inventory item (${putInv.status})`;
    throw new Error(msg);
  }

  const policies = await firstPolicyIds(input.userId);
  const canOffer =
    policies.fulfillmentPolicyId &&
    policies.paymentPolicyId &&
    policies.returnPolicyId &&
    policies.merchantLocationKey;

  let offerId: string | null = null;
  let inventoryOnly = true;

  if (canOffer) {
    const offerBody = {
      sku,
      marketplaceId: "EBAY_GB",
      format: "FIXED_PRICE",
      availableQuantity: 1,
      categoryId,
      listingDescription: description.slice(0, 500000),
      listingPolicies: {
        fulfillmentPolicyId: policies.fulfillmentPolicyId,
        paymentPolicyId: policies.paymentPolicyId,
        returnPolicyId: policies.returnPolicyId,
      },
      merchantLocationKey: policies.merchantLocationKey,
      pricingSummary: {
        price: { value: binPrice.toFixed(2), currency: "GBP" },
      },
    };

    const createOffer = await ebaySellFetch<{ offerId?: string; errors?: { message?: string }[] }>(
      input.userId,
      `/sell/inventory/v1/offer`,
      { method: "POST", body: JSON.stringify(offerBody) },
    );

    if (createOffer.ok && createOffer.data.offerId) {
      offerId = createOffer.data.offerId;
      inventoryOnly = false;
    } else if (createOffer.status === 409) {
      // Offer may already exist for SKU — try to find it
      const listed = await ebaySellFetch<{ offers?: { offerId?: string }[] }>(
        input.userId,
        `/sell/inventory/v1/offer?sku=${encodeURIComponent(sku)}`,
      );
      offerId = listed.data.offers?.[0]?.offerId ?? null;
      inventoryOnly = !offerId;
      if (offerId) {
        await ebaySellFetch(input.userId, `/sell/inventory/v1/offer/${offerId}`, {
          method: "PUT",
          body: JSON.stringify(offerBody),
        });
      }
    }
  }

  const listingDraftUrl = offerId
    ? `https://www.ebay.co.uk/sh/lst/draft?offerId=${encodeURIComponent(offerId)}`
    : `https://www.ebay.co.uk/sh/inventory`;

  return {
    sku,
    offerId,
    listingDraftUrl,
    inventoryOnly,
    referenceImageCount: ref?.imageUrls.length ?? 0,
    message: inventoryOnly
      ? "Inventory item created. Open Seller Hub Inventory, add your own photos, set policies if needed, then publish."
      : "Unpublished offer created. Add your own photos in eBay, then publish when ready.",
  };
}
