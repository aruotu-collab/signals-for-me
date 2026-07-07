"use client";

import Link from "next/link";
import { useDriverSettings } from "@/lib/shiply/driverSettings";

export function VanSettingsNavLink() {
  const { settings, ready, isCustom } = useDriverSettings();

  return (
    <Link
      href="/van-settings"
      className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-slate-300 hover:bg-white/5 hover:text-white sm:px-3"
    >
      Van &amp; rates
      {ready && isCustom && settings.onlyWorthIt && (
        <span className="grid min-w-[18px] place-items-center rounded-full bg-brand-500/20 px-1 text-[11px] font-semibold text-brand-200">
          ✓
        </span>
      )}
    </Link>
  );
}
