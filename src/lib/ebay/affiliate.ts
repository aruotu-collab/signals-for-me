/**
 * eBay Partner Network (EPN) affiliate tracking for outbound item links.
 *
 * Set EBAY_AFFILIATE_CAMPAIGN_ID to your 10-digit Campaign ID from
 * partnernetwork.ebay.com. Optional EBAY_AFFILIATE_CUSTOM_ID prefixes reports.
 *
 * Docs: https://developer.ebay.com/api-docs/buy/static/ref-epn-link.html
 */

const UK_ROTATION_ID = "710-53481-19255-0"; // EBAY_GB
/** toolid 10001 = eBay Browse / Partner APIs */
const TOOL_ID = "10001";

export function getAffiliateCampaignId(): string | null {
  const id = (process.env.EBAY_AFFILIATE_CAMPAIGN_ID || "").trim();
  return id || null;
}

export function isAffiliateConfigured(): boolean {
  return Boolean(getAffiliateCampaignId());
}

/** Header value for Browse API so responses include itemAffiliateWebUrl. */
export function ebayAffiliateEndUserCtx(customId?: string): string | null {
  const campid = getAffiliateCampaignId();
  if (!campid) return null;
  const ref = sanitizeCustomId(customId ?? process.env.EBAY_AFFILIATE_CUSTOM_ID ?? "signalsforme");
  return `affiliateCampaignId=${campid},affiliateReferenceId=${ref}`;
}

/**
 * Ensure an eBay item/search URL carries EPN tracking params for EBAY_GB.
 * Safe to call on URLs that already have affiliate params — we overwrite ours.
 */
export function toAffiliateEbayUrl(rawUrl: string, customId?: string): string {
  const campid = getAffiliateCampaignId();
  if (!campid) return rawUrl;

  try {
    const u = new URL(rawUrl);
    // Only rewrite eBay hosts
    if (!/\.ebay\.(co\.uk|com|de|fr|it|es|ie)$/i.test(u.hostname) && !/^ebay\./i.test(u.hostname)) {
      return rawUrl;
    }

    u.searchParams.set("mkevt", "1");
    u.searchParams.set("mkcid", "1");
    u.searchParams.set("mkrid", UK_ROTATION_ID);
    u.searchParams.set("campid", campid);
    u.searchParams.set("toolid", TOOL_ID);
    const custom = sanitizeCustomId(
      customId ?? process.env.EBAY_AFFILIATE_CUSTOM_ID ?? "signalsforme-flip",
    );
    if (custom) u.searchParams.set("customid", custom);

    return u.toString();
  } catch {
    return rawUrl;
  }
}

function sanitizeCustomId(raw: string): string {
  return raw
    .trim()
    .slice(0, 256)
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
