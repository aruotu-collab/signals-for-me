import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchItemReference } from "@/lib/ebay/itemReference";
import { isEbayApiConfigured } from "@/lib/ebay/client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing item id" }, { status: 400 });
  }
  if (!isEbayApiConfigured()) {
    return NextResponse.json({ error: "eBay API is not configured" }, { status: 503 });
  }

  // Public reference fetch is fine for signed-out users browsing desk on one device,
  // but prefer signed-in for rate hygiene.
  await auth();

  try {
    const ref = await fetchItemReference(decodeURIComponent(id));
    if (!ref) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    return NextResponse.json({
      ...ref,
      photoNote:
        "These photos belong to the original seller. Use them as a private reference only — shoot your own before publishing.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load item" },
      { status: 500 },
    );
  }
}
