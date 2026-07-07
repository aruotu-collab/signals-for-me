import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Legacy — Demand Intelligence",
  robots: { index: false, follow: false },
};

const LINKS = [
  { href: "/ideas", label: "Demand ideas & voting", desc: "Browse and vote on product/service ideas." },
  { href: "/submit", label: "Submit an idea", desc: "Suggest something you wish existed." },
  { href: "/dashboard", label: "Demand dashboard", desc: "Business demand intelligence." },
  { href: "/need", label: "Intent / service pages", desc: "Form-first service request pages." },
  { href: "/pricing", label: "Pricing", desc: "Old business plans." },
];

export default function LegacyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <span className="chip border border-white/10 bg-white/5 text-slate-300">Archived</span>
        <h1 className="mt-2 text-2xl font-bold text-white">Demand Intelligence (legacy)</h1>
        <p className="mt-2 text-sm text-slate-400">
          The previous demand/voting product is preserved here while the app focuses on the Shiply job matrix. Nothing has
          been deleted — these pages still work.
        </p>
      </div>

      <div className="space-y-3">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="card block p-4 transition hover:border-brand-400/30"
          >
            <div className="font-medium text-white">{l.label}</div>
            <div className="text-sm text-slate-500">{l.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
