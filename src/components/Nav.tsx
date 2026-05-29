import Link from "next/link";

export function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-white">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 shadow-glow">
            <SignalGlyph />
          </span>
          <span className="italic">
            Signals<span className="text-brand-400">For</span>Me
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/feed" className="rounded-lg px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white">
            Feed
          </Link>
          <Link href="/pricing" className="rounded-lg px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white">
            Pricing
          </Link>
          <Link href="/feed?view=me" className="btn-primary ml-2 px-3 py-2">
            Signals for Nelson
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
