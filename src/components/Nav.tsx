import Link from "next/link";
import { auth } from "@/auth";
import { AuthButtons } from "./AuthButtons";

export async function Nav() {
  const session = await auth();
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/80 backdrop-blur">
      {/* On mobile (portrait) this wraps into two rows: logo + CTA on top, and
          the scrollable menu strip below. On sm+ it's a single inline row. */}
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
        <Link href="/" className="order-1 flex shrink-0 items-center gap-2 font-bold tracking-tight text-white">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-500 shadow-glow">
            <SignalGlyph />
          </span>
          <span className="hidden italic min-[360px]:inline">
            Signals<span className="text-brand-400">For</span>Me
          </span>
        </Link>
        <Link
          href="/brief"
          className="btn-primary order-2 ml-auto shrink-0 whitespace-nowrap px-2.5 py-2 sm:order-3 sm:ml-2 sm:px-3"
        >
          My Opportunities
        </Link>
        {/* The links scroll horizontally instead of being hidden, so every
            section stays reachable. Scrollbar is visually hidden. */}
        <nav className="order-3 flex w-full min-w-0 touch-pan-x items-center gap-0.5 overflow-x-auto overscroll-x-contain whitespace-nowrap text-sm sm:order-2 sm:w-auto sm:flex-1 sm:gap-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link href="/brief" className="shrink-0 rounded-lg px-2 py-2 text-slate-300 hover:bg-white/5 hover:text-white sm:px-3">
            Opportunities
          </Link>
          <Link href="/summary" className="shrink-0 rounded-lg px-2 py-2 text-slate-300 hover:bg-white/5 hover:text-white sm:px-3">
            Summary
          </Link>
          <Link href="/areas" className="shrink-0 rounded-lg px-2 py-2 text-slate-300 hover:bg-white/5 hover:text-white sm:px-3">
            Top Areas
          </Link>
          <Link href="/feed" className="shrink-0 rounded-lg px-2 py-2 text-slate-300 hover:bg-white/5 hover:text-white sm:px-3">
            Feed
          </Link>
          <Link href="/shortlist" className="shrink-0 rounded-lg px-2 py-2 text-slate-300 hover:bg-white/5 hover:text-white sm:px-3">
            Portfolio
          </Link>
          <Link href="/pricing" className="shrink-0 rounded-lg px-2 py-2 text-slate-300 hover:bg-white/5 hover:text-white sm:px-3">
            Pricing
          </Link>
          <AuthButtons email={session?.user?.email ?? null} />
        </nav>
      </div>
    </header>
  );
}

function SignalGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round">
      <path d="M3 14c2 0 2-4 4-4s2 8 4 8 2-12 4-12 2 8 4 8" />
    </svg>
  );
}
