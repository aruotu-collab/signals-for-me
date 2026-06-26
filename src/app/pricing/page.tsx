import Link from "next/link";
import { PLANS } from "@/lib/billing";

export default function PricingPage() {
  return (
    <div>
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold text-white">Pricing</h1>
        <p className="mt-2 text-slate-400">
          Free for consumers. Business plans unlock demand intelligence that pays for itself.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`card flex flex-col p-6 ${plan.highlight ? "ring-2 ring-brand-500/60" : ""}`}
          >
            {plan.highlight && (
              <span className="mb-2 w-fit rounded-full bg-brand-500/20 px-2 py-0.5 text-xs font-semibold text-brand-200">
                Most popular
              </span>
            )}
            <h2 className="text-lg font-bold text-white">{plan.name}</h2>
            <p className="mt-1 text-sm text-slate-400">{plan.tagline}</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">{plan.priceLabel}</span>
              {plan.pricePerMonth != null && plan.pricePerMonth > 0 && (
                <span className="text-sm text-slate-500">/mo</span>
              )}
            </div>
            <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-300">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check /> {f}
                </li>
              ))}
            </ul>
            <Link
              href={plan.id === "free" ? "/ideas" : plan.id === "enterprise" ? "/dashboard" : "/dashboard"}
              className={`mt-6 ${plan.highlight ? "btn-primary" : "btn-ghost"} w-full`}
            >
              {plan.id === "free" ? "Start voting" : plan.id === "enterprise" ? "Contact sales" : "Get " + plan.name}
            </Link>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-slate-500">
        Stripe checkout will be wired in production. For now, sign in and we&apos;ll enable dashboard access for demo accounts.
      </p>
    </div>
  );
}

function Check() {
  return (
    <svg className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.1 3.1 6.8-6.8a1 1 0 011.4 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}
