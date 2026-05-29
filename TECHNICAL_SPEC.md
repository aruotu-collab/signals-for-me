# Signals For Me — Technical Specification & Build Plan

## 1. Product in one line
An **Opportunity Intelligence Platform**: continuously scan the internet, use AI to convert raw
information into **signals** (opportunity / risk / trend) with a *why it matters*, a *confidence score*,
and a *suggested action*, then deliver them **personalized** to each user ("Signals For Nelson").

It is not a news site, search engine, or database. The value is *detection + personalization + timing*.

---

## 2. The core insight that drives the architecture
The website is ~10% of the work. The valuable 90% is the **data pipeline**: ingesting messy data,
running AI cheaply and reliably, deduplicating, scoring, and matching signals to users. So the system
is designed **pipeline-first**, around a single unified `Signal` object.

```
1. INGESTION   → pull raw data from sources (APIs, feeds, scrapers)
2. PROCESSING  → AI extracts entity, classifies type, scores confidence, writes why + action
3. MATCHING    → personalize: match each signal to user subscriptions/interests
4. DELIVERY    → web feed, email digest, alerts, API
```

This MVP implements all four layers end-to-end.

---

## 3. The unified Signal schema (the heart)
Everything flows through one object. New signal types are **config + a prompt**, not new code.

```
Signal {
  id, type, category(business|consumer), groupName,
  title, summary,
  entityName, entityDomain, entityLocation,
  whyItMatters[],            // reasons
  confidence (0-1),
  suggestedAction,
  sourceUrl, rawSource,
  embedding,                 // for dedup + semantic matching (pgvector in prod)
  dedupKey (unique),         // normalized fingerprint
  detectedAt
}
```

Defined in `prisma/schema.prisma`; the 250+ types live in `src/lib/taxonomy.ts`.

---

## 4. Architecture

### 4.1 Current MVP stack (this repo)
| Layer | Tech | Why |
|---|---|---|
| Web + API | Next.js 15 (App Router) + React 19 + TypeScript | One codebase to start |
| Styling | Tailwind CSS | Fast, modern UI |
| DB | SQLite via Prisma | Zero-setup dev |
| AI | Pluggable provider (`mock` / `openai`) | Runs offline, upgrades with one env var |
| Embeddings | Local hashing embedding | Dedup + matching without external calls |

### 4.2 Production stack (recommended evolution)
| Layer | Recommendation |
|---|---|
| Web/API | Keep Next.js on Vercel |
| DB | **PostgreSQL + pgvector** (Supabase/Neon) — change one line in `schema.prisma` |
| Pipeline workers | Separate **Python** (or Node) workers on Railway/Render/Fly |
| Queue | Redis + BullMQ, or a managed queue (SQS) |
| Scheduling | Cron → Temporal/Airflow as volume grows |
| AI | OpenAI / Anthropic with JSON structured outputs |
| Embeddings | `text-embedding-3-small` stored in pgvector |
| Auth | Clerk or Supabase Auth |
| Email | Resend or Postmark |
| Payments | Stripe (Checkout + webhooks) |

---

## 5. The pipeline in detail (`src/lib/pipeline/`)
1. **Ingest** — each source returns `RawItem[]`. Implemented: `mockSource`, `rssSource`. Add adapters
   (Companies House API, gov tender portals, job board APIs) the same way.
2. **Cheap pre-filter** — discard obvious noise *before* paying for the LLM. This is the #1 cost lever.
3. **AI extract** — `AIProvider.extract(item)` → structured `ExtractedSignal` (classify + score + why +
   action). Mock uses taxonomy keyword hints; OpenAI uses JSON mode.
4. **Dedup** — normalized `dedupKey` (type + entity) so the same event from 5 sources = 1 signal.
   Semantic dedup via embeddings is the next upgrade.
5. **Store** — write the `Signal`. `PipelineRun` records observability counts.

### Cost control (critical to profitability)
- Pre-filter with rules/keywords/small model so the LLM only sees candidates.
- Batch + cache. Track spend per 1,000 items before scaling sources.
- Use the cheapest model that holds accuracy (e.g. `gpt-4o-mini`) and reserve larger models for
  ambiguous items.

---

## 6. Personalization (`src/lib/signals.ts`)
`Subscription` rows capture a user's interests (category / signalType / keyword / minConfidence).
`personalizedFeed(userId)`:
- filters signals to the user's subscriptions,
- ranks by `confidence*0.5 + recency*0.3 + semanticSimilarity*0.2`.

This is the "Signals For You" experience and the retention engine.

---

## 7. Delivery
- **Feed** — `/feed` with audience, type, and confidence filters. `/feed?view=me` is personalized.
- **Digest** — `src/lib/digest.ts` renders an email; `npm run digest` previews it. In prod, a daily
  cron calls Resend with this HTML per user.
- **API** — `/api/signals`, `/api/ingest`, `/api/digest`. `/api/ingest` is called by a scheduler in
  prod, not the browser.

---

## 8. Monetization (`src/lib/billing.ts`)
- **Consumers:** Free → Pro (£12/mo). Premium subs, affiliate, sponsored signals, ads.
- **Businesses:** Team (£49/mo) → Enterprise (API/feeds). Lead-gen, team seats, API access.
Wire `stripePriceEnv` IDs to Stripe Checkout; gate features by `User.plan`.

---

## 9. MVP scope & recommendation
Per the product doc, launch with **20–30 high-value signal types**, not all 250. Suggested wedge:

> **Business · UK · {Funding → Hiring → Buying intent}** — public data, clear B2B buyer, strongest
> ROI story ("raised money + hiring → likely to buy").

The `mvp: true` flags in `taxonomy.ts` mark the launch set. Expand types after 5–10 real users.

### Build order
1. Signal schema + DB ✅
2. One source end-to-end → AI → stored signal ✅
3. Feed UI ✅
4. Auth + subscriptions (personalization) ✅ (demo user; swap in Clerk)
5. Email digest ✅
6. Stripe tiers ✅ (config; wire Checkout)
7. Scale sources + signal types ← next

---

## 10. Risks & guardrails
- **Data sourcing legality** — prefer official APIs over scraping; respect ToS (esp. LinkedIn/news).
- **Honest confidence** — calibrate scores against real outcomes; fake precision destroys trust.
- **Dedup quality** — the same event repeated feels like spam; invest in semantic dedup early.
- **Unit economics** — model LLM cost per 1,000 items before scaling ingestion.

---

## 11. Next steps checklist
- [ ] Switch Prisma datasource to PostgreSQL + enable pgvector; store real embeddings.
- [ ] Replace mock source with 2–3 real adapters (Companies House, a gov tender feed, a job board API).
- [ ] Move ingestion to a scheduled worker + queue.
- [ ] Add Clerk auth; derive the user from the session instead of the demo user.
- [ ] Wire Resend for the daily digest.
- [ ] Wire Stripe Checkout + webhooks; gate features by plan.
- [ ] Add a feedback loop (`SignalEvent`) to calibrate confidence and tune ranking.
