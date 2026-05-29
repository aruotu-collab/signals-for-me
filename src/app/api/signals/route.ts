import { NextRequest, NextResponse } from "next/server";
import { querySignals } from "@/lib/signals";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const category = sp.get("category");
  const signals = await querySignals({
    category: category === "business" || category === "consumer" ? category : undefined,
    type: sp.get("type") ?? undefined,
    q: sp.get("q") ?? undefined,
    minConfidence: sp.get("minConfidence") ? Number(sp.get("minConfidence")) : undefined,
    limit: sp.get("limit") ? Number(sp.get("limit")) : undefined,
  });
  return NextResponse.json({ count: signals.length, signals });
}
