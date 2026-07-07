import { backfillPickupHubs, rebuildShiplyMatrixIndex } from "../src/lib/shiply";

async function main() {
  console.log("Backfilling pickup hubs…");
  const { updated } = await backfillPickupHubs();
  console.log(`Updated ${updated} jobs.`);

  console.log("Rebuilding matrix index…");
  await rebuildShiplyMatrixIndex();
  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
