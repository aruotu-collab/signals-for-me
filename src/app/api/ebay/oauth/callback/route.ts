import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  exchangeAuthorizationCode,
  parseOAuthState,
  upsertSellerConnection,
} from "@/lib/ebay/sellerAuth";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");

  if (err) {
    return NextResponse.redirect(
      new URL(`/flip/desk?ebay=error&reason=${encodeURIComponent(err)}`, SITE_URL),
    );
  }

  const session = await auth();
  const sessionUserId = session?.user?.id;
  if (!sessionUserId) {
    return NextResponse.redirect(new URL("/login?next=/flip/desk", SITE_URL));
  }

  const stateUserId = state ? parseOAuthState(state) : null;
  if (!code || !stateUserId || stateUserId !== sessionUserId) {
    return NextResponse.redirect(new URL("/flip/desk?ebay=error&reason=invalid_state", SITE_URL));
  }

  try {
    const tokens = await exchangeAuthorizationCode(code);
    await upsertSellerConnection(sessionUserId, tokens);
    return NextResponse.redirect(new URL("/flip/desk?ebay=connected", SITE_URL));
  } catch (e) {
    const reason = e instanceof Error ? e.message : "token_exchange_failed";
    return NextResponse.redirect(
      new URL(`/flip/desk?ebay=error&reason=${encodeURIComponent(reason.slice(0, 120))}`, SITE_URL),
    );
  }
}
