# Signals For Me

**Opportunity Intelligence Platform.** AI scans the internet, detects important signals, and delivers
personalized opportunities to businesses and consumers — before they become obvious.

This repo is a working MVP: a Next.js app + a pluggable **ingest → AI → signal** pipeline that runs
end-to-end with **zero API keys** (a deterministic mock AI provider), and upgrades to a real LLM by
setting one environment variable.

---

## Quick start

```bash
# 1. install (already done if node_modules exists)
npm install

# 2. create the local database (SQLite) and seed it with signals
npm run db:reset

# 3. run the app
npm run dev
# open http://localhost:3000
```

That's it. The home page explains the product, `/feed` is the live signal feed, and
`/feed?view=me` is the personalized **"Signals For Nelson"** experience.

---

## What's inside

| Area | Where | Notes |
|---|---|---|
| Signal taxonomy (250+ types) | `src/lib/taxonomy.ts` | Add a signal type = add a config row |
| Unified Signal schema | `prisma/schema.prisma` (`Signal`) | The heart of the product |
| Ingestion sources | `src/lib/pipeline/sources/` | Mock source + real RSS adapter |
| AI extraction | `src/lib/pipeline/ai/` | `mock` (offline) or `openai` provider |
| Pipeline orchestrator | `src/lib/pipeline/index.ts` | fetch → pre-filter → extract → dedup → store |
| Personalization | `src/lib/signals.ts` | `personalizedFeed()` ranks by confidence + recency + similarity |
| Email digest | `src/lib/digest.ts` | Renders "Signals For You" HTML email |
| Billing tiers | `src/lib/billing.ts` | Stripe-ready plan config |
| Web UI | `src/app/` | Landing, feed, signal detail, pricing |

---

## Commands

```bash
npm run dev        # start the app
npm run db:reset   # reset DB + seed (demo user + signals)
npm run db:seed    # seed without resetting
npm run ingest     # run one ingestion cycle from the CLI
npm run ingest -- https://feeds.bbci.co.uk/news/business/rss.xml   # add a live RSS feed
npm run digest     # build the personalized digest (writes digest-preview.html)
npm run build      # production build
```

## Useful endpoints

- `GET /api/signals?category=business&minConfidence=0.7` — query signals
- `POST /api/ingest` — trigger a pipeline run (body optional: `{ "feedUrls": [...] }`)
- `GET /api/digest?format=html` — preview the email digest in the browser

---

## Turning on the real AI

The pipeline ships with a deterministic **mock** provider so everything runs offline. To use a real LLM:

```bash
# .env
AI_PROVIDER="openai"
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"
```

No code changes — the provider is selected at runtime in `src/lib/pipeline/ai/provider.ts`.

---

## Going to production

See **`TECHNICAL_SPEC.md`** for the full architecture, the path from SQLite → Postgres + pgvector,
real data sources, scheduling, auth (Clerk), email (Resend), Stripe billing, and cost control.
