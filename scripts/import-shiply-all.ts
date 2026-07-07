import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { importShiplyJobsFromXlsx } from "../src/lib/shiply";

async function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error("Usage: tsx scripts/import-shiply-all.ts <folder-with-xlsx-files>");
    process.exit(1);
  }

  const files = readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".xlsx"))
    .sort((a, b) => a.localeCompare(b));

  if (!files.length) {
    console.error(`No .xlsx files found in ${dir}`);
    process.exit(1);
  }

  let totalInserted = 0;
  let totalUpdated = 0;
  let totalRows = 0;
  let totalGeocoded = 0;

  for (const file of files) {
    const path = join(dir, file);
    console.log(`\nImporting ${file}...`);
    const buf = readFileSync(path);
    const result = await importShiplyJobsFromXlsx(buf, { filename: file });
    console.log(result);
    totalInserted += result.inserted;
    totalUpdated += result.updated;
    totalRows += result.total;
    totalGeocoded += result.geocoded;
  }

  console.log("\nAll imports complete:", {
    files: files.length,
    inserted: totalInserted,
    updated: totalUpdated,
    total: totalRows,
    geocoded: totalGeocoded,
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
