import { NextResponse } from "next/server";
import { searchPlaces } from "@/lib/nominatim";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const country = searchParams.get("country") ?? "";
  const region = searchParams.get("region") ?? undefined;

  if (!country || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchPlaces({
    query: q,
    countryCode: country,
    regionName: region,
  });

  return NextResponse.json({ results });
}
