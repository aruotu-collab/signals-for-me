import { runPipeline } from "../src/lib/pipeline";

// CLI: `npm run ingest`  — run one ingestion cycle.
// Optionally pass RSS feed URLs as args to pull live news alongside the mock source:
//   npm run ingest -- https://feeds.bbci.co.uk/news/business/rss.xml
async function main() {
  const feeds = process.argv.slice(2);
  const result = await runPipeline(feeds);
  console.log("Ingestion complete:", result);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
