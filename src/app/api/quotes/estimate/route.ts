import { NextResponse } from "next/server";
import { estimateManualDelivery } from "@/lib/ebay/manualEstimate";
import { MATRIX_SERVICE_NAMES } from "@/lib/shiply/parse";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    itemTitle?: unknown;
    service?: unknown;
    pickupPostcode?: unknown;
    deliveryPostcode?: unknown;
  } | null;

  const itemTitle = typeof body?.itemTitle === "string" ? body.itemTitle.trim() : "";
  const service = typeof body?.service === "string" ? body.service.trim() : "";
  const pickupPostcode = typeof body?.pickupPostcode === "string" ? body.pickupPostcode.trim() : "";
  const deliveryPostcode = typeof body?.deliveryPostcode === "string" ? body.deliveryPostcode.trim() : "";

  if (!MATRIX_SERVICE_NAMES.includes(service)) {
    return NextResponse.json({ error: "Select a valid service category." }, { status: 400 });
  }

  const result = await estimateManualDelivery({ itemTitle, service, pickupPostcode, deliveryPostcode });
  if (!result.distanceMiles) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({ result });
}
