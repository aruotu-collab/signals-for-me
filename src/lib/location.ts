// Shared types and helpers for international voter location (country → region → area).

export interface UserLocation {
  locationCountry: string;
  locationRegion: string;
  locationCity: string;
  locationArea: string;
}

export function locationSnapshot(loc: UserLocation) {
  return {
    locationCountry: loc.locationCountry,
    locationRegion: loc.locationRegion,
    locationCity: loc.locationCity,
    locationArea: loc.locationArea,
    postcode: null,
    postcodeDistrict: null,
  };
}

export function hasCompleteLocation(user: {
  locationCountry?: string | null;
  locationRegion?: string | null;
  locationArea?: string | null;
}): boolean {
  return Boolean(user.locationCountry?.trim() && user.locationRegion?.trim() && user.locationArea?.trim());
}

/** UI label for the region dropdown step. */
export function regionStepLabel(countryCode: string): string {
  switch (countryCode) {
    case "US":
    case "NG":
    case "AU":
    case "BR":
    case "IN":
      return "State";
    case "GB":
      return "Nation / region";
    case "CA":
      return "Province";
    default:
      return "State / region";
  }
}

export function formatAreaDisplay(loc: UserLocation): string {
  if (loc.locationCity && loc.locationCity !== loc.locationArea) {
    return `${loc.locationArea}, ${loc.locationCity}`;
  }
  return loc.locationArea;
}
