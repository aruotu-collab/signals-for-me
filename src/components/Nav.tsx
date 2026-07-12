import Link from "next/link";
import { auth } from "@/auth";
import { AuthButtons } from "./AuthButtons";
import { isAdminEmail } from "@/lib/admin";
import { PUBLIC_PRODUCT } from "@/lib/product";

export async function Nav() {
  const session = await auth();
  const email = session?.user?.email ?? null;
  const showAdmin = isAdminEmail(email);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
        <Link href="/" className="order-1 flex shrink-0 items-center gap-2 font-bold tracking-tight text-white">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-500 shadow-glow">
            <DemandGlyph />
          </span>
          <span className="hidden italic min-[360px]:inline">
            Signals<span className="text-brand-400">For</span>Me
          </span>
        </Link>
        <Link
          href={PUBLIC_PRODUCT.primaryHref}
          className="btn-primary order-2 ml-auto shrink-0 whitespace-nowrap px-2.5 py-2 sm:order-3 sm:ml-2 sm:px-3"
        >
          {PUBLIC_PRODUCT.name}
        </Link>
        <nav className="order-3 flex w-full min-w-0 touch-pan-x items-center gap-0.5 overflow-x-auto overscroll-x-contain whitespace-nowrap text-sm sm:order-2 sm:ml-auto sm:w-auto sm:gap-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link
            href="/flip"
            className="shrink-0 rounded-lg px-2 py-2 text-slate-300 hover:bg-white/5 hover:text-white sm:px-3"
          >
            Flip Radar
          </Link>
          <Link
            href="/flip?category=Watches"
            className="shrink-0 rounded-lg px-2 py-2 text-slate-300 hover:bg-white/5 hover:text-white sm:px-3"
          >
            Watches
          </Link>
          <Link
            href="/flip?category=Phones"
            className="shrink-0 rounded-lg px-2 py-2 text-slate-300 hover:bg-white/5 hover:text-white sm:px-3"
          >
            Phones
          </Link>
          <Link
            href="/flip?category=Laptops"
            className="shrink-0 rounded-lg px-2 py-2 text-slate-300 hover:bg-white/5 hover:text-white sm:px-3"
          >
            Laptops
          </Link>
          {showAdmin && (
            <Link
              href="/admin"
              className="shrink-0 rounded-lg px-2 py-2 text-amber-300/90 hover:bg-white/5 hover:text-amber-200 sm:px-3"
            >
              Admin
            </Link>
          )}
          <AuthButtons email={email} />
        </nav>
      </div>
    </header>
  );
}

function DemandGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20V10" />
      <path d="M18 20V4" />
      <path d="M6 20v-4" />
    </svg>
  );
}
