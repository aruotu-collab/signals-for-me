import { readFileSync } from "node:fs";
import { parseShiplyXlsx } from "../src/lib/shiply/parse";
import { refreshShiplyJobsFromRows } from "../src/lib/shiply";

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: tsx scripts/refresh-shiply.ts <path-to-csv-or-xlsx>");
    process.exit(1);
  }

  console.log(`Reading ${path}…`);
  const buf = readFileSync(path);
  const filename = path.split(/[\\/]/).pop() ?? path;
  const rows = parseShiplyXlsx(buf, { filename });
  console.log(`Parsed ${rows.length} rows.`);

  const t0 = Date.now();
  const result = await refreshShiplyJobsFromRows(rows, (msg) => console.log(`  ${msg}`));
  const secs = Math.round((Date.now() - t0) / 1000);

  console.log("\nRefresh complete:", result, `(${secs}s)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
