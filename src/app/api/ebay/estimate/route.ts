import { NextResponse } from "next/server";
import { estimateDelivery } from "@/lib/ebay/estimate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    ebayUrl?: unknown;
    deliveryPostcode?: unknown;
    pickupPostcode?: unknown;
  } | null;

  const ebayUrl = typeof body?.ebayUrl === "string" ? body.ebayUrl.trim() : "";
  const deliveryPostcode = typeof body?.deliveryPostcode === "string" ? body.deliveryPostcode.trim() : "";
  const pickupPostcode = typeof body?.pickupPostcode === "string" ? body.pickupPostcode.trim() : undefined;

  if (!ebayUrl || !deliveryPostcode) {
    return NextResponse.json({ error: "eBay URL and delivery postcode are required." }, { status: 400 });
  }

  const result = await estimateDelivery({ ebayUrl, deliveryPostcode, pickupPostcode });
  return NextResponse.json({ result });
}
