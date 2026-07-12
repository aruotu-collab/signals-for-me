import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Legacy tools",
  robots: { index: false, follow: false },
};

const DRIVER = [
  { href: "/matrix", label: "Pickup Radar", desc: "Shiply / DQC job matrix by service and hub." },
  { href: "/planner", label: "Driver planner", desc: "Multi-drop route planning from a pickup hub." },
  { href: "/quotes", label: "Delivery quotes", desc: "eBay collection and manual buyer quote requests." },
  { href: "/opportunities", label: "eBay jobs for drivers", desc: "Collection-only board, quote bids, empty vans." },
  { href: "/van-settings", label: "Van & rates", desc: "Fuel and hourly rate settings for job profit." },
  { href: "/favourites", label: "My jobs", desc: "Saved delivery shortlist and won work." },
  { href: "/jobs", label: "Jobs by area", desc: "SEO landing pages by pickup hub." },
  { href: "/delivery-jobs", label: "Jobs by type", desc: "SEO landing pages by service category." },
];

const DEMAND = [
  { href: "/ideas", label: "Demand ideas & voting", desc: "Browse and vote on product/service ideas." },
  { href: "/submit", label: "Submit an idea", desc: "Suggest something you wish existed." },
  { href: "/dashboard", label: "Demand dashboard", desc: "Business demand intelligence." },
  { href: "/need", label: "Intent / service pages", desc: "Form-first service request pages." },
  { href: "/pricing", label: "Pricing", desc: "Old business plans." },
];

export default function LegacyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <span className="chip border border-white/10 bg-white/5 text-slate-300">Hidden from main nav</span>
        <h1 className="mt-2 text-2xl font-bold text-white">Legacy tools</h1>
        <p className="mt-2 text-sm text-slate-400">
          The public site now focuses on <Link href="/flip" className="text-brand-300 hover:underline">Flip Radar</Link>.
          Older delivery and demand tools still work here — they are just not shown in the main menu.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Driver / delivery</h2>
        {DRIVER.map((l) => (
          <Link key={l.href} href={l.href} className="card block p-4 transition hover:border-brand-400/30">
            <div className="font-medium text-white">{l.label}</div>
            <div className="text-sm text-slate-500">{l.desc}</div>
          </Link>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Demand intelligence</h2>
        {DEMAND.map((l) => (
          <Link key={l.href} href={l.href} className="card block p-4 transition hover:border-brand-400/30">
            <div className="font-medium text-white">{l.label}</div>
            <div className="text-sm text-slate-500">{l.desc}</div>
          </Link>
        ))}
      </section>
    </div>
  );
}
