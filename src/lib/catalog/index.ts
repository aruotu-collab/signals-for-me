import type { CatalogIdea } from "./utils";
import { CATALOG_PART1 } from "./part1";
import { CATALOG_PART2 } from "./part2";
import { CATALOG_PART3 } from "./part3";
import { CATALOG_PART4 } from "./part4";
import { CATALOG_PART5 } from "./part5";

export type { CatalogIdea } from "./utils";

/** 1,000 starter ideas: 50 categories × 20 pain-point ideas each. */
export const DEMAND_CATALOG: CatalogIdea[] = [
  ...CATALOG_PART1,
  ...CATALOG_PART2,
  ...CATALOG_PART3,
  ...CATALOG_PART4,
  ...CATALOG_PART5,
];

export function catalogStats() {
  const byCategory: Record<string, number> = {};
  for (const i of DEMAND_CATALOG) {
    byCategory[i.category] = (byCategory[i.category] ?? 0) + 1;
  }
  return { total: DEMAND_CATALOG.length, byCategory };
}
