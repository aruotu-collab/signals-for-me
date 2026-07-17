import type { FlipDeskItem } from "@/lib/flip/desk";

export type RelistKit = {
  title: string;
  binPrice: number;
  fastSalePrice: number;
  categoryHint: string;
  conditionLine: string;
  description: string;
  photoChecklist: string[];
  ebayStartUrl: string;
  copyPack: string;
};

/** Strip auction/junk phrases so the BIN title reads clean. */
export function cleanListingTitle(raw: string): string {
  let t = raw
    .replace(/\b(genuine|authentic|rare|boxed|warranty|uk|seller|fast|postage|collection only)\b/gi, " ")
    .replace(/\b(for parts|spares|faulty|broken|untested|job lot)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length > 80) t = t.slice(0, 77).trimEnd() + "…";
  return t || raw.slice(0, 80);
}

function categoryHint(category: string): string {
  switch (category) {
    case "Watches":
      return "Jewellery & Watches → Wristwatches";
    case "Power Tools":
      return "Business, Office & Industrial → Hand & Power Tools";
    case "Cameras":
    case "Camera Lenses":
      return "Cameras & Photography";
    case "Graphics Cards":
      return "Computers/Tablets & Networking → Computer Components";
    case "Gaming Consoles":
      return "Video Games & Consoles";
    case "iPads":
    case "Phones":
    case "Apple Watches":
    case "Laptops":
      return "Mobile Phones & Communication / Computers";
    case "Drones":
      return "Cameras & Photography → Camera Drones";
    case "LEGO":
      return "Toys & Games → Building Toys";
    case "Musical Gear":
      return "Musical Instruments & DJ Equipment";
    case "Sneakers":
      return "Clothes, Shoes & Accessories → Men's/Women's Shoes";
    default:
      return category;
  }
}

function photoChecklist(category: string): string[] {
  const base = [
    "Front / hero shot on plain background",
    "Back / ports / serial if relevant",
    "Any damage, scratches, or wear close-up",
    "What's in the box (chargers, straps, case)",
    "Screen-on / powered / working proof if possible",
  ];
  if (category === "Watches" || category === "Apple Watches") {
    return [
      "Dial close-up",
      "Case back / serial",
      "Bracelet / clasp",
      "Box & papers if any",
      "Wrist or size reference",
    ];
  }
  if (category === "Sneakers") {
    return ["Pair together", "Left/right soles", "Insoles / size tag", "Box label", "Any flaws"];
  }
  return base;
}

/**
 * Build a ready-to-paste BIN pack while the item is still in the post.
 * Goal: receiving day = photos + paste + publish.
 */
export function buildRelistKit(item: FlipDeskItem): RelistKit {
  const title = cleanListingTitle(item.title);
  const cost = (item.buyPrice ?? item.currentPrice) + (item.inboundPostage ?? 0);
  // Aim to clear fees (~13% + £8) and leave solid net; floor above cost.
  const feeAwareFloor = Math.ceil((cost + 8 + 40) / 0.871);
  const binPrice = Math.max(item.marketValue || feeAwareFloor, feeAwareFloor);
  const fastSalePrice = Math.max(Math.round(binPrice * 0.95), feeAwareFloor);

  const conditionLine =
    "Used — fully tested / working unless noted. See photos for exact condition.";

  const description = [
    title,
    "",
    conditionLine,
    "",
    item.brand ? `Brand: ${item.brand}` : null,
    `Category: ${item.category}`,
    "",
    "What's included: [list box contents]",
    "Condition notes: [scratches / battery health / hours / missing bits]",
    "",
    "Dispatched quickly with tracked postage from the UK.",
    "Happy to answer questions before you buy.",
  ]
    .filter(Boolean)
    .join("\n");

  const ebayStartUrl = `https://www.ebay.co.uk/sl/prelist/suggest?${new URLSearchParams({
    title,
  }).toString()}`;

  const copyPack = [
    `TITLE:\n${title}`,
    `BIN PRICE: £${binPrice}  (fast-sale option £${fastSalePrice})`,
    `CATEGORY: ${categoryHint(item.category)}`,
    `CONDITION:\n${conditionLine}`,
    `DESCRIPTION:\n${description}`,
  ].join("\n\n");

  return {
    title,
    binPrice,
    fastSalePrice,
    categoryHint: categoryHint(item.category),
    conditionLine,
    description,
    photoChecklist: photoChecklist(item.category),
    ebayStartUrl,
    copyPack,
  };
}
