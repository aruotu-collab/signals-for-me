import { PrismaClient } from "@prisma/client";
import { buildDigest } from "../src/lib/digest";
import { sendEmail } from "../src/lib/email";
import { writeFileSync } from "node:fs";

const prisma = new PrismaClient();

// CLI: `npm run digest`            — preview the digest for every user.
//      `npm run digest -- --send`  — actually send via Resend (or log in dev).
// Writes an HTML preview to ./digest-preview.html either way.
async function main() {
  const send = process.argv.includes("--send");
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
    if (send && digest.count > 0) {
      const result = await sendEmail({
        to: u.email,
        subject: digest.subject,
        html: digest.html,
        text: digest.text,
      });
      console.log(`  → ${result.sent ? "sent" : "logged"} via ${result.via}`);
    }
  }
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
