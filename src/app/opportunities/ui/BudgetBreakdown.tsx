"use client";

type Props = {
  itemPrice: number | null;
  buyingType?: string | null;
  deliveryLow: number | null;
  deliveryHigh: number | null;
  /** Actual delivery when known (lowest or accepted driver quote). */
  deliveryActual?: number | null;
  deliverySource?: "guide" | "lowest" | "accepted";
  /** Buyer override for item cost (max bid they're willing to pay). */
  itemOverride?: number | null;
  compact?: boolean;
};

function fmt(n: number) {
  return `£${n.toLocaleString("en-GB")}`;
}

export function BudgetBreakdown({
  itemPrice,
  buyingType,
  deliveryLow,
  deliveryHigh,
  deliveryActual,
  deliverySource = "guide",
  itemOverride,
  compact,
}: Props) {
  const itemCost =
    itemOverride != null && Number.isFinite(itemOverride) && itemOverride > 0
      ? itemOverride
      : itemPrice;

  const deliveryLabel =
    deliverySource === "accepted"
      ? "Accepted delivery quote"
      : deliverySource === "lowest"
        ? "Lowest driver quote"
        : "Delivery guide (est.)";

  const hasDeliveryRange = deliveryLow != null && deliveryHigh != null;
  const hasDeliveryActual = deliveryActual != null && deliveryActual > 0;

  let totalLow: number | null = null;
  let totalHigh: number | null = null;
  let totalSingle: number | null = null;

  if (itemCost != null && itemCost > 0) {
    if (hasDeliveryActual) {
      totalSingle = itemCost + deliveryActual;
    } else if (hasDeliveryRange) {
      totalLow = itemCost + deliveryLow;
      totalHigh = itemCost + deliveryHigh;
    }
  }

  if (itemCost == null && !hasDeliveryRange && !hasDeliveryActual) return null;

  const itemLabel =
    buyingType === "Auction"
      ? itemOverride != null
        ? "Your max item bid"
        : itemPrice != null
          ? "Current eBay bid"
          : "Item (auction)"
      : itemPrice != null
        ? "Item price"
        : "Item";

  if (compact) {
    return (
      <div className="text-sm text-slate-300">
        {itemCost != null && <span>{itemLabel}: {fmt(itemCost)}</span>}
        {hasDeliveryActual && (
          <span>
            {itemCost != null ? " + " : ""}
            {deliveryLabel}: {fmt(deliveryActual!)}
          </span>
        )}
        {totalSingle != null && (
          <span className="ml-1 font-semibold text-emerald-300">= {fmt(totalSingle)} total</span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-brand-500/5 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-emerald-300/80">Your budget</div>
      <p className="mt-1 text-xs text-slate-400">
        {deliverySource === "guide"
          ? "If the delivery guide is about right — total you may need before bidding on eBay."
          : deliverySource === "accepted"
            ? "Locked in — this is your confirmed all-in cost."
            : "Updates when drivers quote — accept a quote to lock delivery."}
      </p>

      <div className="mt-3 space-y-2 text-sm">
        <Row
          label={itemLabel}
          value={itemCost != null ? fmt(itemCost) : "Enter max bid below"}
          muted={itemCost == null}
        />
        {hasDeliveryActual ? (
          <Row label={deliveryLabel} value={fmt(deliveryActual!)} highlight={deliverySource === "accepted"} />
        ) : hasDeliveryRange ? (
          <Row label={deliveryLabel} value={`${fmt(deliveryLow!)}–${fmt(deliveryHigh!)}`} />
        ) : (
          <Row label="Delivery" value="Awaiting driver quotes" muted />
        )}
      </div>

      <div className="mt-3 border-t border-white/10 pt-3">
        {totalSingle != null ? (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-white">All-in total</span>
            <span className="text-2xl font-bold text-emerald-200">{fmt(totalSingle)}</span>
          </div>
        ) : totalLow != null && totalHigh != null ? (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-white">All-in total (est.)</span>
            <span className="text-2xl font-bold text-emerald-200">
              {fmt(totalLow)}–{fmt(totalHigh)}
            </span>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Add item price or max bid to see your total budget.</p>
        )}
      </div>

      {deliverySource === "guide" && (
        <p className="mt-2 text-[10px] text-slate-500">
          After drivers quote, your total updates to use the lowest or accepted bid instead of this guide.
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  highlight,
}: {
  label: string;
  value: string;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-400">{label}</span>
      <span
        className={`font-semibold ${muted ? "text-slate-500" : highlight ? "text-emerald-200" : "text-white"}`}
      >
        {value}
      </span>
    </div>
  );
}
