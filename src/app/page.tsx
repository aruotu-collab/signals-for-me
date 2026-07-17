import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildPageMetadata, faqJsonLd, HOME_FAQ } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Flip Radar — undervalued UK eBay auctions with estimated profit",
  description:
    "Scan UK eBay auctions ending soon. Set your profit target for watches, phones and laptops — see buy price, market value, fees, net profit and max bid.",
  path: "/",
  keywords: [
    "eBay auction profit",
    "flip watches UK",
    "undervalued auctions",
    "eBay resale calculator",
    "auction intelligence",
    "Flip Radar",
  ],
});

export default function Home() {
  return (
    <div className="space-y-16">
      <JsonLd data={faqJsonLd(HOME_FAQ)} />
      <section className="pt-8">
        <div className="text-center">
          <span className="chip mx-auto border border-white/10 bg-white/5 text-slate-300">Auction intelligence</span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-6xl">
            Find <span className="text-brand-400">profit opportunities</span> before others do.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400">
            Flip Radar scans UK eBay auctions ending soon — watches first — and estimates net profit after fees. Set how
            much you want to make, then bid with a clear max.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/flip" className="btn-primary px-6 py-3 text-base">
              Open Flip Radar
            </Link>
            <Link href="/flip?category=Watches&minProfit=100" className="btn-ghost px-6 py-3 text-base">
              Watches · £100+
            </Link>
            <Link href="/flip?category=Phones&minProfit=75" className="btn-ghost px-6 py-3 text-base">
              Phones · £75+
            </Link>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <HeroStat label="Seed categories" value="3" />
          <HeroStat label="Primary niche" value="Watches" tone="growth" />
          <HeroStat label="Signal" value="Net profit" />
        </div>
      </section>

      <section>
        <h2 className="text-center text-2xl font-bold text-white">How it works</h2>
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            { n: "01", t: "Set your profit", d: "Choose £75, £100, £150 or more — only opportunities that clear your bar." },
            { n: "02", t: "Scan ending soon", d: "We pull UK eBay auctions for watches, phones and laptops." },
            { n: "03", t: "See the edge", d: "Buy price vs market value, fees, ROI, confidence and max bid." },
            { n: "04", t: "Open on eBay", d: "Bid only if you’d still buy it without the app — then verify sold comps." },
          ].map((s) => (
            <div key={s.n} className="card p-5">
              <div className="text-sm font-bold text-brand-400">{s.n}</div>
              <div className="mt-1 text-lg font-semibold text-white">{s.t}</div>
              <p className="mt-1 text-sm text-slate-400">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-white">Start with what you know</h2>
        <p className="mt-1 text-sm text-slate-400">
          Watches first if you flip them yourself — phones and laptops add volume when you want more leads.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { href: "/flip?category=Watches", title: "Watches", desc: "Your edge niche — Rolex, Omega, Seiko and more." },
            { href: "/flip?category=Power%20Tools", title: "Power Tools", desc: "Milwaukee, Makita, DeWalt — high volume flips." },
            { href: "/flip?category=Cameras", title: "Cameras & lenses", desc: "Sony, Canon, Nikon — often poorly listed." },
            { href: "/flip?category=Graphics%20Cards", title: "Graphics cards", desc: "RTX / RX auction swings." },
            { href: "/flip?category=Gaming%20Consoles", title: "Consoles", desc: "PS5, Switch, Steam Deck." },
            { href: "/flip", title: "All Flip Radar", desc: "14 categories with Deal Score ranking." },
          ].map((c) => (
            <Link key={c.href} href={c.href} className="card block p-5 transition hover:border-brand-400/30">
              <div className="font-semibold text-white">{c.title}</div>
              <p className="mt-1 text-sm text-slate-400">{c.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-xl font-bold text-white">Frequently asked questions</h2>
        <dl className="mt-6 space-y-5">
          {HOME_FAQ.map((item) => (
            <div key={item.question}>
              <dt className="font-medium text-white">{item.question}</dt>
              <dd className="mt-1 text-sm text-slate-400">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

function HeroStat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "growth" | "neutral" }) {
  const color = tone === "growth" ? "text-signal-growth" : "text-white";
  return (
    <div className="card p-6 text-center">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-2 text-3xl font-bold sm:text-4xl ${color}`}>{value}</div>
    </div>
  );
}
