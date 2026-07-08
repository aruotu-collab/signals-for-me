"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Overview", match: (p: string) => p === "/admin" },
  { href: "/admin/jobs", label: "Jobs", match: (p: string) => p.startsWith("/admin/jobs") },
  { href: "/admin/quotes", label: "Quotes", match: (p: string) => p.startsWith("/admin/quotes") },
  { href: "/admin/vans", label: "Empty vans", match: (p: string) => p.startsWith("/admin/vans") },
  { href: "/admin/users", label: "Users", match: (p: string) => p.startsWith("/admin/users") },
  { href: "/admin/leads", label: "Leads", match: (p: string) => p.startsWith("/admin/leads") },
  { href: "/admin/shiply", label: "Import", match: (p: string) => p.startsWith("/admin/shiply") },
  { href: "/admin/intents", label: "Intents", match: (p: string) => p.startsWith("/admin/intents") },
  { href: "/admin/catalog", label: "Catalog", match: (p: string) => p.startsWith("/admin/catalog") },
];

export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-sm text-slate-400 hover:text-white">
          ← Back to site
        </Link>
        <span className="text-xs text-slate-500">Signed in as {email}</span>
      </div>
      <nav className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {LINKS.map((link) => {
          const active = link.match(pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${
                active
                  ? "bg-brand-500/20 text-brand-200"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
