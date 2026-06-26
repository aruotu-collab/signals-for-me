"use client";

import type { ServiceRequestResult } from "@/components/ServiceRequestForm";
import { urgencyLabel } from "@/lib/serviceRequest";

export function ServiceRequestSuccess({ result }: { result: ServiceRequestResult }) {
  const tel = result.callPhone.replace(/\s/g, "");

  return (
    <div className="card border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 to-transparent p-6 sm:p-8">
      <div className="text-center">
        <div className="text-4xl" aria-hidden>
          ✓
        </div>
        <h2 className="mt-3 text-2xl font-bold text-white">You&apos;re all set</h2>
        <p className="mt-2 text-slate-400">
          We&apos;re connecting you with <strong className="text-white">{result.serviceName}</strong> providers
          in <strong className="text-white">{result.areaDisplay}</strong>.
        </p>
        <p className="mt-1 text-sm text-slate-500">Urgency: {urgencyLabel(result.urgency)}</p>
      </div>

      {result.callPhone ? (
        <div className="mt-8 space-y-4">
          <a
            href={`tel:${tel}`}
            className="btn-primary flex w-full items-center justify-center gap-2 py-5 text-xl"
          >
            <span aria-hidden>📞</span>
            Call now — {result.callPhone}
          </a>
          <p className="text-center text-sm text-slate-400">
            Tap to call. Mention you need <span className="text-white">{result.serviceName}</span> in{" "}
            {result.areaDisplay}.
          </p>
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center">
          <p className="text-sm font-medium text-white">We&apos;ve received your request</p>
          <p className="mt-2 text-sm text-slate-400">
            A provider in {result.areaDisplay} will contact you at the number you gave us. Reference:{" "}
            <span className="font-mono text-xs text-slate-300">{result.id.slice(0, 8)}</span>
          </p>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-slate-600">
        Request saved. If you don&apos;t hear back within an hour for urgent requests, try again or browse related
        services below.
      </p>
    </div>
  );
}
