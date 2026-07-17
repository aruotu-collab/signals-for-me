import { getEbayItem } from "@/lib/ebay/search";

export type EbayItemReference = {
  itemId: string;
  legacyItemId: string | null;
  title: string;
  categoryId: string | null;
  condition: string | null;
  conditionId: string | null;
  brand: string | null;
  aspects: Record<string, string[]>;
  imageUrls: string[];
  price: number | null;
  currency: string;
};

type BrowseItem = {
  itemId?: string;
  legacyItemId?: string;
  title?: string;
  condition?: string;
  conditionId?: string;
  categoryId?: string;
  categories?: { categoryId?: string; categoryName?: string }[];
  image?: { imageUrl?: string };
  additionalImages?: { imageUrl?: string }[];
  localizedAspects?: { name?: string; value?: string }[];
  price?: { value?: string; currency?: string };
  brand?: string;
};

function extractLegacyId(itemId: string, legacy?: string): string | null {
  if (legacy) return legacy;
  const m = itemId.match(/\|(\d+)\|/);
  return m?.[1] ?? (/^\d+$/.test(itemId) ? itemId : null);
}

export async function fetchItemReference(itemId: string): Promise<EbayItemReference | null> {
  const raw = (await getEbayItem(itemId)) as BrowseItem | null;
  if (!raw?.itemId && !raw?.title) return null;

  const id = raw.itemId ?? itemId;
  const aspects: Record<string, string[]> = {};
  for (const a of raw.localizedAspects ?? []) {
    if (!a.name || !a.value) continue;
    if (!aspects[a.name]) aspects[a.name] = [];
    aspects[a.name]!.push(a.value);
  }

  const imageUrls: string[] = [];
  if (raw.image?.imageUrl) imageUrls.push(raw.image.imageUrl);
  for (const img of raw.additionalImages ?? []) {
    if (img.imageUrl && !imageUrls.includes(img.imageUrl)) imageUrls.push(img.imageUrl);
  }

  const categoryId =
    raw.categoryId ?? raw.categories?.[0]?.categoryId ?? null;
  const brand = raw.brand ?? aspects.Brand?.[0] ?? aspects.brand?.[0] ?? null;
  const priceStr = raw.price?.value;
  const price = priceStr ? Number.parseFloat(priceStr) : null;

  return {
    itemId: id,
    legacyItemId: extractLegacyId(id, raw.legacyItemId),
    title: raw.title ?? "Untitled",
    categoryId,
    condition: raw.condition ?? null,
    conditionId: raw.conditionId ?? null,
    brand,
    aspects,
    imageUrls,
    price: Number.isFinite(price) ? price : null,
    currency: raw.price?.currency ?? "GBP",
  };
}
