import { PrismaClient } from "@prisma/client";
import { runPipeline } from "../src/lib/pipeline";
import { DEMO_EMAIL } from "../src/lib/demo";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Signals For Me…");

  // 1. Demo user (the "Signals For Nelson" persona) + subscriptions.
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "Nelson",
      audience: "business",
      plan: "pro",
    },
  });

  await prisma.subscription.deleteMany({ where: { userId: user.id } });
  await prisma.subscription.createMany({
    data: [
      { userId: user.id, category: "business", signalType: "funding", minConfidence: 0.6 },
      { userId: user.id, category: "business", signalType: "hiring", minConfidence: 0.6 },
      { userId: user.id, category: "business", signalType: "gov_tender", minConfidence: 0.55 },
      { userId: user.id, category: "consumer", signalType: "remote_job", keyword: "remote", minConfidence: 0.6 },
      { userId: user.id, category: "consumer", signalType: "ai_tool", minConfidence: 0.55 },
    ],
  });

  // 2. Run the pipeline to generate signals from the mock source.
  const result = await runPipeline();
  console.log("Pipeline result:", result);

  const total = await prisma.signal.count();
  console.log(`Done. ${total} signals in the database. Demo user: ${DEMO_EMAIL}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
