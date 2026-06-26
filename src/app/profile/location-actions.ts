"use server";

import { Country, State, City } from "country-state-city";

export async function listCountries() {
  return Country.getAllCountries()
    .map((c) => ({ code: c.isoCode, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listRegions(countryCode: string) {
  if (!countryCode) return [];
  return State.getStatesOfCountry(countryCode)
    .map((s) => ({ code: s.isoCode, name: s.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Cities/towns from bundled data — quick picks before Nominatim search. */
export async function listLocalities(countryCode: string, regionCode: string) {
  if (!countryCode || !regionCode) return [];
  return City.getCitiesOfState(countryCode, regionCode)
    .map((c) => ({ name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 200);
}
