import { PrismaClient } from "@prisma/client";
import { buildDigest } from "../src/lib/digest";
import { writeFileSync } from "node:fs";

const prisma = new PrismaClient();

// CLI: `npm run digest` — build the personalized digest for every user.
// Writes an HTML preview to ./digest-preview.html. In production this is where
// you'd call Resend/Postmark to actually send the email.
async function main() {
  const users = await prisma.user.findMany();
  for (const u of users) {
    const digest = await buildDigest(u.id);
    if (!digest) continue;
    console.log(`\n${digest.subject}\n${"-".repeat(digest.subject.length)}`);
    console.log(digest.text);
    if (u.name === "Nelson") {
      writeFileSync("digest-preview.html", digest.html, "utf8");
      console.log("\n(Preview written to digest-preview.html)");
    }
  }
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
