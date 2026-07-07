import { NextResponse } from "next/server";
import { isEbayApiConfigured } from "@/lib/ebay/client";
import { MOCK_EBAY_LISTINGS } from "@/lib/ebay/mock";
import { searchCollectionOnlyListings } from "@/lib/ebay/search";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? "all";

  if (!isEbayApiConfigured()) {
    const listings =
      category === "all" ? MOCK_EBAY_LISTINGS : MOCK_EBAY_LISTINGS.filter((l) => l.category === category);
    return NextResponse.json({
      listings,
      source: "mock",
      message: "eBay API not configured — showing sample data.",
    });
  }

  try {
    const { listings, source } = await searchCollectionOnlyListings({ category });
    if (listings.length === 0) {
      const fallback =
        category === "all" ? MOCK_EBAY_LISTINGS : MOCK_EBAY_LISTINGS.filter((l) => l.category === category);
      return NextResponse.json({
        listings: fallback,
        source: "mock",
        message: "Live search returned no results for this filter — showing sample data.",
      });
    }
    return NextResponse.json({ listings, source, message: null });
  } catch (e) {
    const fallback =
      category === "all" ? MOCK_EBAY_LISTINGS : MOCK_EBAY_LISTINGS.filter((l) => l.category === category);
    return NextResponse.json({
      listings: fallback,
      source: "mock",
      message: e instanceof Error ? e.message : "eBay search failed — showing sample data.",
    });
  }
}
