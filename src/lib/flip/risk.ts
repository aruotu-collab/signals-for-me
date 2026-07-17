const RISK_PATTERNS: { flag: string; re: RegExp }[] = [
  { flag: "replica / homage", re: /\b(replica|homage|tribute|fake|counterfeit|aftermarket dial)\b/i },
  {
    flag: "for parts / not working",
    re: /\b(for parts|spares(?:\s+or\s+repair)?|as parts|parts\/repair|not working|doesn'?t work|does not work|faulty|broken|non[- ]?runner|not running|not tested|untested|no power|powers?\s*on\s*only|boot\s*loop|dead|as[- ]?is\b.*\b(fault|broke|part)|faulty\s+for\s+parts)\b/i,
  },
  { flag: "unauthenticated", re: /\b(unauthenticated|not authentic|cannot authenticate|no authenticity)\b/i },
  { flag: "lot / bulk", re: /\b(lot of|job lot|bundle of \d+|watch lot|assorted job lot)\b/i },
  { flag: "parts only", re: /\b(movement only|case only|dial only|bracelet only|board only|screen only|chassis only)\b/i },
  {
    flag: "accessory / part",
    re: /\b(strap|bracelet|bezel|clasp|crystal|crown|winder|watch box|presentation box|nato strap|rubber strap|deployment)\b|\b(dial|bezel|links?)\s*$/i,
  },
];

/** eBay conditionId 7000 = For parts or not working */
export function isPartsOrNotWorkingCondition(conditionId: string | number | null | undefined): boolean {
  if (conditionId == null || conditionId === "") return false;
  return String(conditionId) === "7000";
}

export function riskFlagsFromTitle(title: string): string[] {
  const flags: string[] = [];
  for (const p of RISK_PATTERNS) {
    if (p.re.test(title)) flags.push(p.flag);
  }
  return flags;
}

/** Soften market value when risk flags are present. */
export function riskMarketMultiplier(flags: string[]): number {
  if (
    flags.some(
      (f) =>
        f.includes("replica") ||
        f.includes("parts only") ||
        f.includes("for parts") ||
        f.includes("accessory"),
    )
  ) {
    return 0.15;
  }
  if (flags.some((f) => f.includes("unauthenticated"))) return 0.55;
  if (flags.some((f) => f.includes("lot"))) return 0.7;
  return 1;
}

/** Auto-hide junk so you do not re-buy parts / dead stock. */
export function shouldHideByDefault(flags: string[]): boolean {
  return flags.some(
    (f) =>
      f.includes("replica") ||
      f.includes("for parts") ||
      f.includes("parts only") ||
      f.includes("accessory"),
  );
}
