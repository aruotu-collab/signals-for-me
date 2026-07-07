import type { Metadata } from "next";
import { DriverSettingsPanel } from "@/components/shiply/DriverSettingsPanel";

export const metadata: Metadata = {
  title: "Van & rates — your driver profile",
  description: "Set your van mpg, fuel price, minimum profit rate, and job filters for personalised route intelligence.",
};

export default function VanSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <span className="chip border border-white/10 bg-white/5 text-slate-300">Driver profile</span>
        <h1 className="mt-2 text-2xl font-bold text-white">Your van &amp; rates</h1>
        <p className="mt-1 text-sm text-slate-400">
          Personalise fuel, profit and £/hour estimates across Pickup Radar, Planner, and My Jobs.
        </p>
      </header>

      <DriverSettingsPanel standalone />
    </div>
  );
}
