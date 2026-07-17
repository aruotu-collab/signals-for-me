import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteSellerConnection } from "@/lib/ebay/sellerAuth";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  await deleteSellerConnection(userId);
  return NextResponse.json({ ok: true });
}
