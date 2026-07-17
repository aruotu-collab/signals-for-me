"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFlipDesk } from "@/components/FlipDeskProvider";
import {
  FLIP_DESK_STATUS_LABEL,
  FLIP_DESK_STATUSES,
  daysWaiting,
  itemCost,
  type FlipDeskItem,
  type FlipDeskStatus,
} from "@/lib/flip/desk";
import { buildRelistKit } from "@/lib/flip/relist";

type SellerStatus = {
  connected: boolean;
  signedIn: boolean;
  connectedAt?: string;
};

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
    patchItem,
  } = useFlipDesk();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<FlipDeskStatus | "all">("all");
  const [moneyId, setMoneyId] = useState<string | null>(null);
  const [moneyValue, setMoneyValue] = useState("");
  const [postageValue, setPostageValue] = useState("");
  const [moneyMode, setMoneyMode] = useState<"won" | "sold" | "received">("won");
  const [seller, setSeller] = useState<SellerStatus | null>(null);
  const [sellerBusy, setSellerBusy] = useState(false);

  const refreshSeller = useCallback(async () => {
    try {
      const res = await fetch("/api/ebay/seller/status");
      const json = (await res.json()) as SellerStatus;
      setSeller(json);
    } catch {
      setSeller({ connected: false, signedIn: false });
    }
  }, []);

  useEffect(() => {
    void refreshSeller();
  }, [refreshSeller, searchParams]);

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

  async function disconnectSeller() {
    setSellerBusy(true);
    try {
      await fetch("/api/ebay/oauth/disconnect", { method: "POST" });
      await refreshSeller();
    } finally {
      setSellerBusy(false);
    }
  }

  const ebayFlash = searchParams.get("ebay");

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

      <EbaySellerBanner
        seller={seller}
        busy={sellerBusy}
        flash={ebayFlash}
        onDisconnect={disconnectSeller}
      />

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
          While a parcel is incoming, open Relist kit — create an eBay draft, then add your own photos when it arrives.
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
            sellerConnected={Boolean(seller?.connected)}
            signedIn={Boolean(seller?.signedIn)}
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
            onPatch={(patch) => patchItem(item.id, patch)}
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

function EbaySellerBanner({
  seller,
  busy,
  flash,
  onDisconnect,
}: {
  seller: SellerStatus | null;
  busy: boolean;
  flash: string | null;
  onDisconnect: () => void;
}) {
  return (
    <div className="card space-y-2 border border-brand-500/20 bg-brand-500/5 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-brand-300">eBay seller</div>
      {flash === "connected" && (
        <p className="text-sm text-emerald-300">Seller account connected. You can create unpublished drafts from Relist kit.</p>
      )}
      {flash === "error" && (
        <p className="text-sm text-red-200">Could not connect eBay. Check RuName / redirect URI on your developer app, then try again.</p>
      )}
      {seller?.connected ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-slate-200">Connected for one-click drafts.</p>
          <button
            type="button"
            disabled={busy}
            onClick={onDisconnect}
            className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 disabled:opacity-50"
          >
            Disconnect
          </button>
        </div>
      ) : seller?.signedIn === false ? (
        <p className="text-sm text-slate-300">
          <Link href="/login?next=/flip/desk" className="text-brand-300 hover:underline">
            Sign in
          </Link>{" "}
          to connect your eBay seller account for one-click drafts.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <a href="/api/ebay/oauth/start" className="btn-primary px-3 py-2 text-sm">
            Connect eBay seller
          </a>
          <p className="text-xs text-slate-500">
            Creates unpublished inventory/offers. Auction photos stay reference-only — you add your own before publish.
          </p>
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
  sellerConnected,
  signedIn,
  onWatching,
  onBidding,
  onWon,
  onReceived,
  onLost,
  onSelling,
  onSold,
  onRemove,
  onPatch,
}: {
  item: FlipDeskItem;
  sellerConnected: boolean;
  signedIn: boolean;
  onWatching: () => void;
  onBidding: () => void;
  onWon: () => void;
  onReceived: () => void;
  onLost: () => void;
  onSelling: () => void;
  onSold: () => void;
  onRemove: () => void;
  onPatch: (patch: Partial<FlipDeskItem>) => void;
}) {
  const [showKit, setShowKit] = useState(false);
  const [copied, setCopied] = useState("");
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftMsg, setDraftMsg] = useState("");
  const [refBusy, setRefBusy] = useState(false);
  const waiting = daysWaiting(item);
  const canRelist = item.status === "incoming" || item.status === "stock" || item.status === "selling";
  const kit = canRelist ? buildRelistKit(item) : null;

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

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      setCopied("failed");
    }
  }

  async function loadReference() {
    setRefBusy(true);
    setDraftMsg("");
    try {
      const res = await fetch(`/api/ebay/item/${encodeURIComponent(item.id)}`);
      const json = (await res.json()) as { imageUrls?: string[]; error?: string };
      if (!res.ok) {
        setDraftMsg(json.error ?? "Could not load auction details");
        return;
      }
      onPatch({ referenceImageUrls: json.imageUrls ?? [] });
    } catch (e) {
      setDraftMsg(e instanceof Error ? e.message : "Could not load auction details");
    } finally {
      setRefBusy(false);
    }
  }

  async function createDraft() {
    if (!kit) return;
    setDraftBusy(true);
    setDraftMsg("");
    try {
      const res = await fetch("/api/ebay/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceItemId: item.id,
          title: kit.title,
          description: kit.description,
          binPrice: kit.binPrice,
          category: item.category,
          brand: item.brand,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        listingDraftUrl?: string;
        offerId?: string | null;
        message?: string;
        code?: string;
      };
      if (!res.ok) {
        setDraftMsg(json.error ?? "Draft failed");
        return;
      }
      onPatch({
        ebayDraftUrl: json.listingDraftUrl ?? null,
        ebayOfferId: json.offerId ?? null,
        status: "selling",
      });
      setDraftMsg(json.message ?? "Draft created");
    } catch (e) {
      setDraftMsg(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setDraftBusy(false);
    }
  }

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
            {item.ebayDraftUrl && (
              <a href={item.ebayDraftUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-300 hover:underline">
                eBay draft
              </a>
            )}
          </div>
          <h2 className="mt-1 line-clamp-2 text-sm font-medium text-white">{item.title}</h2>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
            <span>
              Cost in <span className="text-slate-200">£{itemCost(item).toLocaleString("en-GB")}</span>
            </span>
            <span>
              Est. profit <span className="text-emerald-300">£{item.estimatedProfit.toLocaleString("en-GB")}</span>
            </span>
            {kit && (
              <span>
                Relist BIN <span className="text-brand-200">£{kit.binPrice.toLocaleString("en-GB")}</span>
              </span>
            )}
          </div>
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
        {canRelist && (
          <Action onClick={() => setShowKit((v) => !v)}>{showKit ? "Hide relist kit" : "Relist kit"}</Action>
        )}
        <button type="button" onClick={onRemove} className="ml-auto text-xs text-slate-500 hover:text-red-300">
          Remove
        </button>
      </div>

      {showKit && kit && (
        <div className="space-y-3 border-t border-white/5 bg-white/[0.02] px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-brand-300">Relist kit</span>
            {copied && <span className="text-xs text-emerald-300">Copied {copied}</span>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <KitField label="Title" value={kit.title} onCopy={() => copyText("title", kit.title)} />
            <KitField
              label="BIN price"
              value={`£${kit.binPrice.toLocaleString("en-GB")} · fast sale £${kit.fastSalePrice.toLocaleString("en-GB")}`}
              onCopy={() => copyText("price", String(kit.binPrice))}
            />
            <KitField label="Category" value={kit.categoryHint} onCopy={() => copyText("category", kit.categoryHint)} />
            <KitField
              label="Condition"
              value={kit.conditionLine}
              onCopy={() => copyText("condition", kit.conditionLine)}
            />
          </div>
          <KitField
            label="Description"
            value={kit.description}
            multiline
            onCopy={() => copyText("description", kit.description)}
          />

          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wide text-slate-500">
                Auction photo reference (private — do not publish as your listing images)
              </span>
              <button
                type="button"
                disabled={refBusy}
                onClick={loadReference}
                className="text-[10px] text-brand-300 hover:underline disabled:opacity-50"
              >
                {refBusy ? "Loading…" : item.referenceImageUrls?.length ? "Refresh" : "Load from auction"}
              </button>
            </div>
            {item.referenceImageUrls && item.referenceImageUrls.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {item.referenceImageUrls.slice(0, 8).map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-md object-cover bg-white/5 ring-1 ring-white/10"
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Load auction photos to plan your own shots.</p>
            )}
          </div>

          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Photo checklist (do on unbox)</div>
            <ul className="space-y-1 text-xs text-slate-400">
              {kit.photoChecklist.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-brand-400">·</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copyText("full pack", kit.copyPack)}
              className="rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10"
            >
              Copy full pack
            </button>
            {sellerConnected ? (
              <button
                type="button"
                disabled={draftBusy}
                onClick={createDraft}
                className="btn-primary px-3 py-2 text-xs disabled:opacity-50"
              >
                {draftBusy ? "Creating draft…" : "Create eBay draft"}
              </button>
            ) : (
              <span className="self-center text-xs text-slate-500">
                {signedIn ? (
                  <a href="/api/ebay/oauth/start" className="text-brand-300 hover:underline">
                    Connect eBay
                  </a>
                ) : (
                  <Link href="/login?next=/flip/desk" className="text-brand-300 hover:underline">
                    Sign in
                  </Link>
                )}{" "}
                for one-click draft
              </span>
            )}
            <a
              href={item.ebayDraftUrl || kit.ebayStartUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10"
            >
              {item.ebayDraftUrl ? "Open eBay draft →" : "Start eBay listing →"}
            </a>
            {item.status === "stock" && <Action onClick={onSelling}>Mark as selling</Action>}
          </div>
          {draftMsg && <p className="text-xs text-slate-400">{draftMsg}</p>}
        </div>
      )}
    </article>
  );
}

function KitField({
  label,
  value,
  multiline,
  onCopy,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-ink-950/40 p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
        <button type="button" onClick={onCopy} className="text-[10px] text-brand-300 hover:underline">
          Copy
        </button>
      </div>
      <p className={`text-sm text-slate-200 ${multiline ? "whitespace-pre-wrap" : "line-clamp-3"}`}>{value}</p>
    </div>
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
