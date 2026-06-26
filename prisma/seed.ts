import { PrismaClient } from "@prisma/client";
import { runPipeline } from "../src/lib/pipeline";
import { DEMO_EMAIL } from "../src/lib/demo";
import { DEMAND_CATALOG } from "../src/lib/catalog";

const prisma = new PrismaClient();

const SEED_IDEAS = [
  {
    title: "Dentist open after 6pm on weekdays",
    description:
      "A dental practice that offers appointments after normal working hours — ideally until 8 or 9pm. Perfect for professionals who can't take time off during the day.",
    category: "health",
    location: "UK-wide",
  },
  {
    title: "Mobile car wash at your home",
    description:
      "Someone comes to your driveway, washes and vacuums your car while you work from home. No need to drive to a car wash or wait in a queue.",
    category: "automotive",
    location: "UK-wide",
  },
  {
    title: "Weekend childcare in my neighbourhood",
    description:
      "Reliable, vetted childcare available on Saturdays and Sundays for a few hours — so parents can run errands, exercise, or have a break.",
    category: "childcare",
    location: "UK-wide",
  },
  {
    title: "Same-day dry cleaning pickup & delivery",
    description:
      "Pick up my dry cleaning in the morning and return it cleaned the same evening. I never have time to drop off and collect.",
    category: "home",
    location: "London",
  },
  {
    title: "Grocery delivery after midnight",
    description:
      "Late-night grocery delivery for shift workers, parents with newborns, and anyone who realises they're out of essentials at 11pm.",
    category: "food",
    location: "UK-wide",
  },
  {
    title: "Mobile dog grooming at home",
    description:
      "A groomer comes to my house with their van, grooms my dog in the driveway, and leaves — no stressful car ride or salon wait.",
    category: "pets",
    location: "UK-wide",
  },
  {
    title: "AI personal tax advisor for self-employed",
    description:
      "An affordable AI tool that understands UK tax rules for freelancers and sole traders — answers questions, flags deductions, and pre-fills returns.",
    category: "finance",
    location: "UK-wide",
  },
  {
    title: "Airport luggage pickup from my home",
    description:
      "A service that collects my luggage from home the night before a flight and checks it in, so I travel hands-free to the airport.",
    category: "travel",
    location: "London",
  },
  {
    title: "Mobile wheelie bin cleaning service",
    description:
      "Someone comes monthly to pressure-wash and sanitise my wheelie bins. They always smell terrible and I hate doing it myself.",
    category: "home",
    location: "UK-wide",
    source: "user" as const,
  },
  {
    title: "Home blood test with same-day results",
    description:
      "A nurse visits my home, takes blood samples, and I get results on my phone the same day — no GP wait or hospital trip.",
    category: "health",
    location: "UK-wide",
  },
  {
    title: "Personal trainer who comes to my home",
    description:
      "A qualified PT who visits my home for 45-minute sessions — no gym membership, no travel, works around my schedule.",
    category: "fitness",
    location: "Manchester",
  },
  {
    title: "Same-day tailor / alterations service",
    description:
      "Drop off or pickup clothing in the morning, get alterations done and returned the same day. For last-minute events and busy professionals.",
    category: "home",
    location: "London",
    source: "user" as const,
  },
];

const DEMO_USERS = [
  { email: "consumer1@demo.signalsforme.app", name: "Sarah", ageRange: "25-34", incomeBand: "40-60k", isParent: true, isHomeowner: false, postcode: "SW1A 1AA" },
  { email: "consumer2@demo.signalsforme.app", name: "James", ageRange: "35-44", incomeBand: "60-80k", isParent: true, isHomeowner: true, postcode: "M1 1AE" },
  { email: "consumer3@demo.signalsforme.app", name: "Priya", ageRange: "25-34", incomeBand: "40-60k", isParent: false, isHomeowner: false, postcode: "E1 6AN" },
  { email: "consumer4@demo.signalsforme.app", name: "Tom", ageRange: "45-54", incomeBand: "80k+", isParent: true, isHomeowner: true, postcode: "B1 1BB" },
  { email: "consumer5@demo.signalsforme.app", name: "Emma", ageRange: "25-34", incomeBand: "20-40k", isParent: false, isHomeowner: false, postcode: "LS1 1BA" },
];

const VOTE_KINDS = ["like", "need", "would_pay", "local", "waitlist"] as const;
const PRICE_BANDS = ["10", "20", "30", "40+"] as const;
const FREQUENCIES = ["weekly", "monthly", "quarterly", "once"] as const;
const URGENCIES = ["nice", "useful", "urgent"] as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  console.log("Seeding SignalsForMe (Demand Intelligence)…");

  // Demo business user
  const businessUser = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { plan: "pro", audience: "business" },
    create: {
      email: DEMO_EMAIL,
      name: "Nelson",
      audience: "business",
      plan: "pro",
      businessType: "dentist",
      location: "London",
    },
  });

  // Demo consumers with demographics
  const consumers = [];
  for (const u of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { ageRange: u.ageRange, incomeBand: u.incomeBand, isParent: u.isParent, isHomeowner: u.isHomeowner, postcode: u.postcode },
      create: { ...u, audience: "consumer" },
    });
    consumers.push(user);
  }

  // Clear existing demand data for idempotent re-seed
  await prisma.demandComment.deleteMany();
  await prisma.demandVote.deleteMany();
  await prisma.demandIdea.deleteMany();

  const useCatalog = process.env.SEED_DEMAND_CATALOG === "1";
  const seedVotes = process.env.SEED_DEMAND_VOTES !== "0";
  const catalogIdeas = useCatalog
    ? DEMAND_CATALOG.map((c) => ({
        title: c.title,
        description: c.description,
        category: c.category,
        location: c.location ?? "UK-wide",
        source: "platform" as const,
      }))
    : [];

  // Create demand ideas (either the big catalog, or the small curated set)
  const sourceIdeas = useCatalog ? catalogIdeas : SEED_IDEAS;
  let ideas: { id: string }[] = [];

  if (useCatalog && sourceIdeas.length > 100) {
    const BATCH = 100;
    for (let i = 0; i < sourceIdeas.length; i += BATCH) {
      await prisma.demandIdea.createMany({
        data: sourceIdeas.slice(i, i + BATCH).map((seed) => ({
          title: seed.title,
          description: seed.description,
          category: seed.category,
          location: seed.location,
          source: (seed as { source?: "platform" | "user" }).source ?? "platform",
        })),
      });
    }
    ideas = await prisma.demandIdea.findMany({ select: { id: true } });
  } else {
    for (const seed of sourceIdeas) {
      const idea = await prisma.demandIdea.create({
        data: {
          title: seed.title,
          description: seed.description,
          category: seed.category,
          location: seed.location,
          source: (seed as { source?: "platform" | "user" }).source ?? "platform",
        },
        select: { id: true },
      });
      ideas.push(idea);
    }
  }

  if (!seedVotes) {
    const result = await runPipeline().catch(() => ({ kept: 0 }));
    console.log("Pipeline result:", result);
    const signalTotal = await prisma.signal.count();
    console.log(`Done. ${ideas.length} demand ideas, 0 votes, ${signalTotal} legacy signals.`);
    console.log(`Business demo: ${businessUser.email} (plan: pro)`);
    return;
  }

  // Generate realistic votes (small sets only — skip for full catalog)
  let voteCount = 0;
  for (const idea of ideas) {
    const numVotes = 30 + Math.floor(Math.random() * 70);
    for (let i = 0; i < numVotes; i++) {
      const user = pick(consumers);
      const kind = pick(VOTE_KINDS);
      const createdAt = daysAgo(Math.floor(Math.random() * 30));

      try {
        await prisma.demandVote.create({
          data: {
            ideaId: idea.id,
            userId: user.id,
            kind,
            priceBand: kind === "would_pay" || kind === "waitlist" ? pick(PRICE_BANDS) : undefined,
            frequency: kind === "would_pay" ? pick(FREQUENCIES) : undefined,
            urgency: pick(URGENCIES),
            postcode: user.postcode,
            createdAt,
          },
        });
        voteCount++;
      } catch {
        // duplicate kind per user — skip
      }
    }

    // Add some anonymous-style votes (no user) for volume
    const anonVotes = 10 + Math.floor(Math.random() * 30);
    for (let i = 0; i < anonVotes; i++) {
      await prisma.demandVote.create({
        data: {
          ideaId: idea.id,
          kind: pick(VOTE_KINDS),
          priceBand: pick(PRICE_BANDS),
          frequency: pick(FREQUENCIES),
          urgency: pick(URGENCIES),
          postcode: pick(["SW1A", "M1", "B1", "E1", "LS1", "G1", "EH1"]),
          createdAt: daysAgo(Math.floor(Math.random() * 14)),
        },
      });
      voteCount++;
    }

    // Comments
    const comments = [
      "I've been waiting for something like this for years!",
      "Would definitely use this weekly if the price was right.",
      "Surprised this doesn't exist already in my area.",
      "My whole street would sign up for this.",
    ];
    for (let i = 0; i < 2 + Math.floor(Math.random() * 4); i++) {
      await prisma.demandComment.create({
        data: {
          ideaId: idea.id,
          userId: pick(consumers).id,
          body: pick(comments),
          createdAt: daysAgo(Math.floor(Math.random() * 20)),
        },
      });
    }
  }

  // Keep legacy signal pipeline for backward compat
  const result = await runPipeline().catch(() => ({ kept: 0 }));
  console.log("Pipeline result:", result);

  const signalTotal = await prisma.signal.count();
  console.log(`Done. ${ideas.length} demand ideas, ${voteCount}+ votes, ${signalTotal} legacy signals.`);
  console.log(`Business demo: ${businessUser.email} (plan: pro)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
