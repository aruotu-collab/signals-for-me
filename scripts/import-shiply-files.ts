import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { importShiplyJobsFromXlsx } from "../src/lib/shiply";
import { categoryFromFilename, parseShiplyXlsx } from "../src/lib/shiply/parse";

async function main() {
  const paths = process.argv.slice(2);
  if (!paths.length) {
    console.error("Usage: tsx scripts/import-shiply-files.ts <file1.csv> [file2.csv …]");
    process.exit(1);
  }

  let totalInserted = 0;
  let totalUpdated = 0;
  let totalRows = 0;
  let totalGeocoded = 0;
  const byService = new Map<string, number>();

  for (const path of paths) {
    const filename = basename(path);
    const cat = categoryFromFilename(filename);
    console.log(`\nImporting ${filename} → ${cat.service} (${cat.serviceType})…`);

    const buf = readFileSync(path);
    const preview = parseShiplyXlsx(buf, { filename });
    console.log(`  parsed ${preview.length} rows (sample url: ${preview[0]?.shiplyUrl ?? "n/a"})`);

    const result = await importShiplyJobsFromXlsx(buf, { filename });
    console.log(`  inserted=${result.inserted} updated=${result.updated} geocoded=${result.geocoded}`);

    totalInserted += result.inserted;
    totalUpdated += result.updated;
    totalRows += result.total;
    totalGeocoded += result.geocoded;
    byService.set(cat.service, (byService.get(cat.service) ?? 0) + result.total);
  }

  console.log("\nMerge import complete:", {
    files: paths.length,
    inserted: totalInserted,
    updated: totalUpdated,
    total: totalRows,
    geocoded: totalGeocoded,
    byService: Object.fromEntries([...byService.entries()].sort((a, b) => b[1] - a[1])),
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
