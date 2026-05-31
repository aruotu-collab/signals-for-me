import Link from "next/link";
import { auth } from "@/auth";
import { AuthButtons } from "./AuthButtons";

export async function Nav() {
  const session = await auth();
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold tracking-tight text-white">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-500 shadow-glow">
            <SignalGlyph />
          </span>
          <span className="hidden italic min-[360px]:inline">
            Signals<span className="text-brand-400">For</span>Me
          </span>
        </Link>
        <nav className="flex items-center gap-0.5 text-sm sm:gap-1">
          <Link href="/feed" className="rounded-lg px-2 py-2 text-slate-300 hover:bg-white/5 hover:text-white sm:px-3">
            Feed
          </Link>
          <Link href="/pricing" className="rounded-lg px-2 py-2 text-slate-300 hover:bg-white/5 hover:text-white sm:px-3">
            Pricing
          </Link>
          <AuthButtons email={session?.user?.email ?? null} />
          <Link
            href="/feed?view=me"
            className="btn-primary ml-1 whitespace-nowrap px-2.5 py-2 sm:ml-2 sm:px-3"
          >
            My Signals
          </Link>
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
