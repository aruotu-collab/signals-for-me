import type { PickupCountry } from "@/lib/shiply/hubs";

export type JobCountryFilter = "all" | PickupCountry;

export const JOB_COUNTRY_FILTERS: { id: JobCountryFilter; label: string }[] = [
  { id: "all", label: "All countries" },
  { id: "uk", label: "United Kingdom" },
  { id: "international", label: "International" },
];

export function keyMatchesCountryFilter(
  key: string,
  filter: JobCountryFilter,
  countryByKey: Record<string, PickupCountry>,
): boolean {
  if (filter === "all") return true;
  return countryByKey[key] === filter;
}

export function filterKeysByCountry(
  keys: string[],
  filter: JobCountryFilter,
  countryByKey: Record<string, PickupCountry>,
): string[] {
  if (filter === "all") return keys;
  return keys.filter((k) => keyMatchesCountryFilter(k, filter, countryByKey));
}

export function hubMatchesCountryFilter(hub: string, filter: JobCountryFilter): boolean {
  if (filter === "all") return true;
  if (filter === "international") return hub === "International";
  return hub !== "International";
}
