import type { RawItem } from "@/lib/types";

// A realistic stand-in for live feeds (news APIs, job boards, gov portals,
// social trends). Mirrors the variety the real ingestion layer will produce so
// the pipeline + UI can be built and demoed end-to-end with zero setup.
const RAW: RawItem[] = [
  {
    title: "Helio Robotics raises £15M Series A to scale UK operations",
    content:
      "London-based Helio Robotics has raised £15M in a Series A round led by Northzone. The company says it will hire operations managers, sales staff and engineers, and open a second office in Manchester.",
    url: "https://example.com/helio-series-a",
    source: "news",
  },
  {
    title: "Brightwave Energy is hiring 40 engineers after winning grid contract",
    content:
      "Brightwave Energy announced it is now recruiting across engineering and project management as it ramps up delivery. Several roles offer visa sponsorship.",
    url: "https://example.com/brightwave-hiring",
    source: "job_board",
  },
  {
    title: "NHS Trust publishes tender for patient data platform",
    content:
      "A government contract notice was published seeking suppliers for a new patient data platform. The framework covers procurement of software and integration services over 3 years.",
    url: "https://example.com/nhs-tender",
    source: "gov",
  },
  {
    title: "Acme Retail evaluating CRM migration away from legacy system",
    content:
      "Acme Retail is looking for software vendors as it plans a CRM migration. The company issued an RFP and is actively evaluating providers for a rollout next quarter.",
    url: "https://example.com/acme-crm",
    source: "news",
  },
  {
    title: "Northgate Logistics announces warehouse development near Leeds",
    content:
      "Northgate Logistics secured planning permission for a major warehouse development. Construction tender to follow, with a main contractor to be appointed in spring.",
    url: "https://example.com/northgate-dev",
    source: "news",
  },
  {
    title: "Fintech rival Paywise cuts 200 jobs amid budget cuts",
    content:
      "Paywise announced layoffs and a hiring freeze following a revenue warning. Analysts cite margin pressure across the sector.",
    url: "https://example.com/paywise-layoffs",
    source: "news",
  },
  {
    title: "Senior Platform Engineer (Remote, £95k–£120k) at Lumen Health",
    content:
      "Lumen Health is hiring a senior platform engineer. Fully remote within the UK, salary £95k–£120k. Apply now — interviews start next week.",
    url: "https://example.com/lumen-remote-job",
    source: "job_board",
  },
  {
    title: "Flights from London to Lagos drop to £312 return this week",
    content:
      "A travel deal site flagged an unusually cheap flight: London to Lagos return fares fell to £312, well below the typical £650. Likely an error fare — book fast.",
    url: "https://example.com/lagos-fare",
    source: "social",
  },
  {
    title: "New AI tool 'DraftPilot' automates customer support replies",
    content:
      "Founders are buzzing about DraftPilot, a new AI tool that drafts customer support responses. It launched this week and is trending on Product Hunt.",
    url: "https://example.com/draftpilot",
    source: "social",
  },
  {
    title: "UK savings accounts now paying 5.1% — best rate in 2 years",
    content:
      "Several banks raised savings rates to 5.1%, the highest in two years. Money experts say lock in before rates fall again.",
    url: "https://example.com/savings-rate",
    source: "news",
  },
  {
    title: "Side hustle trend: print-on-demand stores hit record demand",
    content:
      "A growing side hustle: creators are launching print-on-demand stores with near-zero upfront cost. Demand is surging into the holiday season.",
    url: "https://example.com/pod-side-hustle",
    source: "social",
  },
  {
    title: "Startup networking event in Manchester next Thursday",
    content:
      "A local startup networking event and job fair is happening near you in Manchester next Thursday. Limited capacity — register to attend.",
    url: "https://example.com/mcr-event",
    source: "social",
  },
  {
    title: "Vertex Cloud partners with DataForge on enterprise AI rollout",
    content:
      "Vertex Cloud announced a strategic partnership with DataForge to accelerate enterprise AI adoption for mid-market customers.",
    url: "https://example.com/vertex-partner",
    source: "news",
  },
  {
    title: "Council announces £40M regeneration project and innovation grants",
    content:
      "A local council unveiled a £40M regeneration programme including SME grants and innovation funding for technology businesses in the region.",
    url: "https://example.com/regeneration",
    source: "gov",
  },
  {
    title: "Quantum Foods acquires rival snack brand CrispCo",
    content:
      "Quantum Foods acquires CrispCo in a deal expected to expand its distribution and trigger new hiring across sales and supply chain.",
    url: "https://example.com/quantum-crispco",
    source: "news",
  },
];

export async function fetchMockItems(): Promise<RawItem[]> {
  // Light variation so repeated runs feel live without creating dupes-by-text.
  return RAW;
}
