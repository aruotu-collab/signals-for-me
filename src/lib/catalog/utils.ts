export type CatalogIdea = {
  category: string;
  title: string;
  description: string;
  location?: string;
};

/** Turn compact [title, description] pairs into catalog rows. */
export function cat(category: string, rows: [string, string][]): CatalogIdea[] {
  return rows.map(([title, description]) => ({ category, title, description, location: "UK-wide" }));
}
