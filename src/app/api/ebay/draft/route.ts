import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createEbayListingDraft } from "@/lib/ebay/createDraft";
import { getSellerConnection } from "@/lib/ebay/sellerAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in to create an eBay draft" }, { status: 401 });
  }

  const conn = await getSellerConnection(userId);
  if (!conn) {
    return NextResponse.json(
      { error: "Connect your eBay seller account first", code: "not_connected" },
      { status: 400 },
    );
  }

  let body: {
    sourceItemId?: string;
    title?: string;
    description?: string;
    binPrice?: number;
    category?: string;
    brand?: string | null;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.sourceItemId || !body.binPrice || body.binPrice <= 0) {
    return NextResponse.json({ error: "sourceItemId and binPrice are required" }, { status: 400 });
  }

  try {
    const result = await createEbayListingDraft({
      userId,
      sourceItemId: body.sourceItemId,
      title: body.title,
      description: body.description,
      binPrice: body.binPrice,
      category: body.category,
      brand: body.brand,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Draft creation failed" },
      { status: 500 },
    );
  }
}
