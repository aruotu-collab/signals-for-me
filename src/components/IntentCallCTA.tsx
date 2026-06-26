import Link from "next/link";

const DEFAULT_CALL = process.env.NEXT_PUBLIC_INTENT_CALL_NUMBER ?? "";

export function IntentCallCTA({
  serviceName,
  callPhone,
  compact = false,
}: {
  serviceName: string;
  callPhone?: string | null;
  compact?: boolean;
}) {
  const phone = callPhone || DEFAULT_CALL;

  if (!phone) {
    return (
      <div className={`rounded-xl border border-white/10 bg-white/[0.03] ${compact ? "p-4" : "p-5"}`}>
        <div className="text-sm font-semibold text-white">Call for {serviceName}</div>
        <p className="mt-1 text-xs text-slate-400">
          Phone routing launches soon.{" "}
          <Link href="#vote" className="text-brand-300 underline">
            Vote below
          </Link>{" "}
          to show demand in your area.
        </p>
      </div>
    );
  }

  const tel = phone.replace(/\s/g, "");

  return (
    <a
      href={`tel:${tel}`}
      className={`btn-primary flex w-full items-center justify-center gap-2 ${compact ? "py-3 text-base" : "py-4 text-lg"}`}
    >
      <span aria-hidden>📞</span>
      Call now — {phone}
    </a>
  );
}
