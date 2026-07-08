"use client";

import { useState } from "react";
import { BuyerEstimateForm } from "./BuyerEstimateForm";
import { ManualJobForm } from "./ManualJobForm";

type Tab = "ebay" | "manual";

export function QuotesHub() {
  const [tab, setTab] = useState<Tab>("ebay");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("ebay")}
          className={`chip ${tab === "ebay" ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          eBay item
        </button>
        <button
          type="button"
          onClick={() => setTab("manual")}
          className={`chip ${tab === "manual" ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          My own job
        </button>
      </div>

      {tab === "ebay" ? <BuyerEstimateForm /> : <ManualJobForm />}
    </div>
  );
}
