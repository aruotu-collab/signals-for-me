import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSellerConnection } from "@/lib/ebay/sellerAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ connected: false, signedIn: false });
  }
  const conn = await getSellerConnection(userId);
  if (!conn) {
    return NextResponse.json({ connected: false, signedIn: true });
  }
  return NextResponse.json({
    connected: true,
    signedIn: true,
    connectedAt: conn.connectedAt.toISOString(),
    ebayUserId: conn.ebayUserId,
  });
}
