const RISK_PATTERNS: { flag: string; re: RegExp }[] = [
  { flag: "replica / homage", re: /\b(replica|homage|tribute|fake|counterfeit|aftermarket dial)\b/i },
  { flag: "for parts", re: /\b(for parts|spares|spares or repair|as parts|not working|faulty|broken|non[- ]?runner|not running|not tested)\b/i },
  { flag: "unauthenticated", re: /\b(unauthenticated|not authentic|cannot authenticate)\b/i },
  { flag: "lot / bulk", re: /\b(lot of|job lot|bundle of \d+|watch lot|assorted job lot)\b/i },
  { flag: "parts only", re: /\b(movement only|case only|dial only|bracelet only)\b/i },
  {
    flag: "accessory / part",
    re: /\b(strap|bracelet|bezel|clasp|crystal|crown|winder|watch box|presentation box|nato strap|rubber strap|deployment)\b|\b(dial|bezel|links?)\s*$/i,
  },
];

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

export function shouldHideByDefault(flags: string[]): boolean {
  return flags.some(
    (f) =>
      f.includes("replica") ||
      f.includes("for parts") ||
      f.includes("parts only") ||
      f.includes("accessory"),
  );
}
