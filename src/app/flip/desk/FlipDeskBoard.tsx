"use client";

import { useState } from "react";
import Link from "next/link";
import { useFlipDesk } from "@/components/FlipDeskProvider";
import {
  FLIP_DESK_STATUS_LABEL,
  FLIP_DESK_STATUSES,
  daysWaiting,
  itemCost,
  type FlipDeskItem,
  type FlipDeskStatus,
} from "@/lib/flip/desk";

export function FlipDeskBoard() {
  const {
    items,
    ready,
    stats,
    setStatus,
    markWon,
    markReceived,
    markLost,
    markSelling,
    markSold,
    unwatch,
    clearLost,
  } = useFlipDesk();
  const [tab, setTab] = useState<FlipDeskStatus | "all">("all");
  const [moneyId, setMoneyId] = useState<string | null>(null);
  const [moneyValue, setMoneyValue] = useState("");
  const [postageValue, setPostageValue] = useState("");
  const [moneyMode, setMoneyMode] = useState<"won" | "sold" | "received">("won");

  if (!ready) {
    return <div className="card p-8 text-center text-sm text-slate-400">Loading your desk…</div>;
  }

  const visible =
    tab === "all" ? items.filter((i) => i.status !== "lost") : items.filter((i) => i.status === tab);

  const active =
    stats.watching + stats.bidding + stats.incoming + stats.stock + stats.selling;

  function openMoney(id: string, mode: "won" | "sold" | "received", preset?: number, postagePreset?: number) {
    setMoneyId(id);
    setMoneyMode(mode);
    setMoneyValue(preset != null ? String(preset) : "");
    setPostageValue(postagePreset != null && postagePreset > 0 ? String(postagePreset) : "");
  }

  function submitMoney() {
    if (!moneyId) return;
    const postage = postageValue.trim() ? Number(postageValue) : 0;
    if (moneyMode === "received") {
      markReceived(moneyId, Number.isFinite(postage) && postage >= 0 ? postage : undefined);
      setMoneyId(null);
      setMoneyValue("");
      setPostageValue("");
      return;
    }
    const n = Number(moneyValue);
    if (!Number.isFinite(n) || n <= 0) return;
    if (moneyMode === "won") {
      markWon(moneyId, n, Number.isFinite(postage) && postage >= 0 ? postage : undefined);
    } else {
      markSold(moneyId, n);
    }
    setMoneyId(null);
    setMoneyValue("");
    setPostageValue("");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MoneyCard label="Banked profit" value={stats.bankedProfit} tone="good" hint="Sold flips" />
        <MoneyCard label="Planned profit" value={stats.plannedProfit} tone="plan" hint="Still in pipeline" />
        <MoneyCard
          label="Awaiting delivery"
          value={stats.awaitingDelivery}
          tone="warn"
          hint={`${stats.incoming} item${stats.incoming === 1 ? "" : "s"} not received`}
        />
        <MoneyCard label="Capital tied up" value={stats.capitalTied} tone="neutral" hint="Incoming + stock + selling" />
        <MoneyCard label="Full picture" value={stats.totalPicture} tone="brand" hint="Banked + planned" />
      </div>

      <div className="card flex flex-wrap items-center gap-2 p-4">
        <Link href="/flip" className="btn-primary px-3 py-2 text-sm">
          Find new deals
        </Link>
        <button
          type="button"
          onClick={clearLost}
          className="rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10"
        >
          Clear lost ({stats.lost})
        </button>
        <p className="w-full text-xs text-slate-500 sm:ml-auto sm:w-auto">
          Won → awaiting delivery → received → sell. Profit is not real until the item is in hand and sold.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <TabChip active={tab === "all"} onClick={() => setTab("all")} label={`Active (${active})`} />
        {FLIP_DESK_STATUSES.map((s) => (
          <TabChip
            key={s}
            active={tab === s}
            onClick={() => setTab(s)}
            label={`${FLIP_DESK_STATUS_LABEL[s]} (${stats[s]})`}
          />
        ))}
      </div>

      {visible.length === 0 && (
        <div className="card space-y-3 p-8 text-center text-sm text-slate-400">
          <p>Nothing on your desk here yet.</p>
          <p>
            Open <Link href="/flip" className="text-brand-300 hover:underline">Flip Radar</Link>, tap{" "}
            <span className="text-slate-200">Watch</span> on deals you like, then come back to track bids and money.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {visible.map((item) => (
          <DeskCard
            key={item.id}
            item={item}
            onWatching={() => setStatus(item.id, "watching")}
            onBidding={() => setStatus(item.id, "bidding")}
            onWon={() => openMoney(item.id, "won", item.currentPrice, item.inboundPostage ?? undefined)}
            onReceived={() =>
              openMoney(item.id, "received", undefined, item.inboundPostage ?? undefined)
            }
            onLost={() => markLost(item.id)}
            onSelling={() => markSelling(item.id)}
            onSold={() => openMoney(item.id, "sold", item.marketValue)}
            onRemove={() => unwatch(item.id)}
          />
        ))}
      </div>

      {moneyId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="card w-full max-w-sm space-y-4 p-5">
            <h2 className="font-semibold text-white">
              {moneyMode === "won"
                ? "You won — what did you pay?"
                : moneyMode === "received"
                  ? "Mark as received"
                  : "What did you sell for?"}
            </h2>
            {moneyMode !== "received" && (
              <label className="block text-sm text-slate-400">
                Item £
                <input
                  autoFocus
                  type="number"
                  min={1}
                  step={1}
                  value={moneyValue}
                  onChange={(e) => setMoneyValue(e.target.value)}
                  className="ml-2 w-28 rounded border border-white/10 bg-ink-900 px-2 py-1.5 text-white"
                />
              </label>
            )}
            {(moneyMode === "won" || moneyMode === "received") && (
              <label className="block text-sm text-slate-400">
                Inbound postage £
                <input
                  autoFocus={moneyMode === "received"}
                  type="number"
                  min={0}
                  step={1}
                  value={postageValue}
                  onChange={(e) => setPostageValue(e.target.value)}
                  placeholder="0"
                  className="ml-2 w-24 rounded border border-white/10 bg-ink-900 px-2 py-1.5 text-white"
                />
                <span className="mt-1 block text-xs text-slate-500">
                  Counts against profit — money spent before the item is in hand.
                </span>
              </label>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={submitMoney} className="btn-primary px-4 py-2 text-sm">
                {moneyMode === "received" ? "Received" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setMoneyId(null)}
                className="rounded-lg bg-white/5 px-4 py-2 text-sm text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MoneyCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone: "good" | "plan" | "neutral" | "brand" | "warn";
  hint: string;
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-300"
      : tone === "plan"
        ? "text-amber-200"
        : tone === "warn"
          ? "text-orange-300"
          : tone === "brand"
            ? "text-brand-200"
            : "text-white";
  return (
    <div className="card p-4">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>£{value.toLocaleString("en-GB")}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

function TabChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-xs transition ${
        active ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function DeskCard({
  item,
  onWatching,
  onBidding,
  onWon,
  onReceived,
  onLost,
  onSelling,
  onSold,
  onRemove,
}: {
  item: FlipDeskItem;
  onWatching: () => void;
  onBidding: () => void;
  onWon: () => void;
  onReceived: () => void;
  onLost: () => void;
  onSelling: () => void;
  onSold: () => void;
  onRemove: () => void;
}) {
  const waiting = daysWaiting(item);
  const ends =
    item.endsAt == null
      ? null
      : (() => {
          const mins = Math.round((new Date(item.endsAt).getTime() - Date.now()) / 60_000);
          if (mins < 0) return "Ended";
          if (mins < 60) return `${mins}m left`;
          return `${Math.round(mins / 60)}h left`;
        })();

  const statusTone =
    item.status === "incoming"
      ? waiting != null && waiting >= 7
        ? "bg-orange-500/20 text-orange-200"
        : "bg-amber-500/15 text-amber-200"
      : "bg-white/5 text-slate-300";

  return (
    <article className={`card overflow-hidden ${item.status === "incoming" ? "ring-1 ring-amber-500/30" : ""}`}>
      <div className="flex gap-4 p-4">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover bg-white/5" />
        ) : (
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-white/5 text-[10px] text-slate-500">
            No img
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusTone}`}>
              {FLIP_DESK_STATUS_LABEL[item.status]}
            </span>
            <span className="text-xs text-slate-500">{item.category}</span>
            {ends && item.status !== "incoming" && item.status !== "stock" && (
              <span className="text-xs text-slate-500">{ends}</span>
            )}
            {waiting != null && (
              <span className={`text-xs ${waiting >= 7 ? "text-orange-300" : "text-slate-500"}`}>
                Waiting {waiting} day{waiting === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <h2 className="mt-1 line-clamp-2 text-sm font-medium text-white">{item.title}</h2>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
            <span>
              Cost in <span className="text-slate-200">£{itemCost(item).toLocaleString("en-GB")}</span>
              {item.inboundPostage ? ` (incl. £${item.inboundPostage} postage)` : ""}
            </span>
            <span>
              Est. profit <span className="text-emerald-300">£{item.estimatedProfit.toLocaleString("en-GB")}</span>
            </span>
            {item.status === "watching" || item.status === "bidding" ? (
              <span>
                Max bid <span className="text-slate-200">£{item.maxBid.toLocaleString("en-GB")}</span>
              </span>
            ) : null}
            {item.actualProfit != null && (
              <span>
                Banked <span className="text-emerald-300">£{item.actualProfit.toLocaleString("en-GB")}</span>
              </span>
            )}
          </div>
          {item.status === "incoming" && (
            <p className="mt-2 text-xs text-amber-200/90">
              Paid but not received — capital is tied up and profit is not bankable yet.
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-white/5 px-4 py-3">
        <a href={item.ebayUrl} target="_blank" rel="noreferrer" className="btn-primary px-3 py-1.5 text-xs">
          Open eBay
        </a>
        {(item.status === "watching" || item.status === "bidding") && (
          <>
            {item.status === "watching" && <Action onClick={onBidding}>I&apos;m bidding</Action>}
            {item.status === "bidding" && <Action onClick={onWatching}>Back to watch</Action>}
            <Action onClick={onWon}>Won</Action>
            <Action onClick={onLost}>Lost</Action>
          </>
        )}
        {item.status === "incoming" && <Action onClick={onReceived}>Received</Action>}
        {item.status === "stock" && <Action onClick={onSelling}>List for sale</Action>}
        {(item.status === "stock" || item.status === "selling") && <Action onClick={onSold}>Sold</Action>}
        <button type="button" onClick={onRemove} className="ml-auto text-xs text-slate-500 hover:text-red-300">
          Remove
        </button>
      </div>
    </article>
  );
}

function Action({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}
