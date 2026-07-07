import { sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";

type QuoteRequestLike = {
  publicToken: string;
  itemTitle: string | null;
  pickupHub: string | null;
  deliveryPostcode: string;
  distanceMiles: number | null;
  buyerEmail: string | null;
};

type BidLike = {
  amount: number;
  driverName: string | null;
  driverPhone: string;
  message: string | null;
  etaNotes: string | null;
};

function wrap(title: string, bodyHtml: string): string {
  return `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
    <h2 style="color:#0f172a">${title}</h2>
    ${bodyHtml}
    <p style="color:#94a3b8;font-size:12px;margin-top:24px">SignalsForMe — collection-only delivery quotes</p>
  </div>`;
}

/** Buyer gets an email each time a driver submits a quote. */
export async function notifyBuyerOfBid(req: QuoteRequestLike, bid: BidLike): Promise<void> {
  if (!req.buyerEmail) return;
  const link = `${SITE_URL}/opportunities/quote/${req.publicToken}`;
  const item = req.itemTitle ?? "your eBay item";

  try {
    await sendEmail({
      to: req.buyerEmail,
      subject: `New delivery quote: £${bid.amount} for ${item}`,
      html: wrap("You have a new delivery quote", `
        <p><strong>${bid.driverName ?? "A driver"}</strong> quoted <strong>£${bid.amount}</strong> to deliver
        “${item}”${req.distanceMiles ? ` (${req.distanceMiles} miles)` : ""}.</p>
        ${bid.message ? `<p style="color:#475569">“${bid.message}”</p>` : ""}
        ${bid.etaNotes ? `<p style="color:#475569">Availability: ${bid.etaNotes}</p>` : ""}
        <p><a href="${link}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Compare quotes &amp; accept</a></p>
        <p style="color:#94a3b8;font-size:12px">Know your full cost before bidding on eBay.</p>
      `),
    });
  } catch {
    // Non-fatal — bid is already saved.
  }
}

/** Driver gets an email when the buyer accepts their quote. */
export async function notifyDriverAccepted(
  bid: BidLike & { driverEmail: string | null },
  req: QuoteRequestLike,
): Promise<void> {
  if (!bid.driverEmail) return;
  const item = req.itemTitle ?? "the eBay item";

  try {
    await sendEmail({
      to: bid.driverEmail,
      subject: `Quote accepted: £${bid.amount} — ${item}`,
      html: wrap("Your quote was accepted", `
        <p>The buyer accepted your <strong>£${bid.amount}</strong> quote for “${item}”.</p>
        <p>Route: ${req.pickupHub ?? "pickup"} → ${req.deliveryPostcode}${req.distanceMiles ? ` (${req.distanceMiles} miles)` : ""}.</p>
        <p>They may still be waiting to win the auction — you'll get a confirmation once they've purchased.</p>
      `),
    });
  } catch {
    // Non-fatal.
  }
}

/** Driver gets an email when buyer confirms they won/bought the item. */
export async function notifyDriverPurchaseConfirmed(
  bid: BidLike & { driverEmail: string | null },
  req: QuoteRequestLike,
): Promise<void> {
  if (!bid.driverEmail) return;
  const item = req.itemTitle ?? "the eBay item";

  try {
    await sendEmail({
      to: bid.driverEmail,
      subject: `Job confirmed — buyer purchased ${item}`,
      html: wrap("Delivery job confirmed", `
        <p>The buyer has now purchased “${item}” and confirmed your <strong>£${bid.amount}</strong> delivery.</p>
        <p>Route: ${req.pickupHub ?? "pickup"} → ${req.deliveryPostcode}.</p>
        <p>Contact the buyer to arrange collection.</p>
      `),
    });
  } catch {
    // Non-fatal.
  }
}
