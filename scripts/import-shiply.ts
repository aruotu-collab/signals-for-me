import { readFileSync } from "node:fs";
import { importShiplyJobsFromXlsx } from "../src/lib/shiply";

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: tsx scripts/import-shiply.ts <path-to-xlsx>");
    process.exit(1);
  }
  const buf = readFileSync(path);
  const filename = path.split(/[\\/]/).pop() ?? path;
  const result = await importShiplyJobsFromXlsx(buf, { filename });
  console.log("Import complete:", result);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
