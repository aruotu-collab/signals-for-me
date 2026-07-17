import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isEbayApiConfigured } from "@/lib/ebay/client";
import { buildSellerAuthorizeUrl } from "@/lib/ebay/sellerAuth";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.redirect(new URL("/login?next=/flip/desk", SITE_URL));
  }
  if (!isEbayApiConfigured()) {
    return NextResponse.json({ error: "eBay API is not configured" }, { status: 503 });
  }
  try {
    const url = buildSellerAuthorizeUrl(userId);
    return NextResponse.redirect(url);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to start eBay OAuth" },
      { status: 500 },
    );
  }
}
