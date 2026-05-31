# Signals For Me — Go-To-Market Playbook (Beta)

A practical, no-budget plan to get the first 10–100 users. **Wedge: business-first** —
recruitment agencies and B2B sales teams targeting funded / hiring companies. The
consumer side (jobs, flights, AI tools, deals) stays on and free as a brand/SEO engine,
but we don't actively sell it yet.

> Why this wedge: the signal → money path is obvious ("Company raised £15M + hiring 40"
> = someone should call them today), budgets already exist (Apollo, Sales Nav, Cognism),
> and you only need a handful of paying customers to validate.

---

## The 30-day loop

### Week 1 — Make the demo undeniable
- Manually curate 20–30 **real, current** UK signals (real companies, real funding/hiring news).
- The product must feel alive and accurate, not seeded. This is what converts.

### Week 2 — "Signal of the day" on LinkedIn (free, public, self-demoing)
Post one real detected signal per day. Templates below.

### Week 3 — Direct outbound, 10/day
DM recruiters / agency owners / SDR leaders. Give them a personalized feed link. No signup wall.

### Week 4 — Convert to design partners
Offer a "founding customer" rate (e.g. £49/mo locked forever) in exchange for weekly feedback.

---

## LinkedIn "Signal of the day" templates

**Template A — the opportunity callout**
> 🚨 Signal of the day
>
> [Company] just [raised £Xm / announced 40 new roles / won a £Ym contract].
>
> If you [sell {thing} / recruit {role} / provide {service}], this is your window —
> they have fresh budget and a hiring mandate *right now*, before everyone else notices.
>
> This is exactly the kind of thing Signals For Me detects automatically. 👇
> [link]

**Template B — the "who should care" breakdown**
> [Company] is migrating off [legacy system] and evaluating vendors.
>
> Who should be paying attention:
> • Solution vendors → pitch during active evaluation
> • Implementation partners → offer migration services
> • Competitors → they're in-market and comparing
>
> We surface the signal *and* who it creates an opportunity for. [link]

**Template C — the contrarian/insight hook**
> Most "sales intelligence" tells you a company exists.
>
> The money is in *timing* — the week they raise, hire, or start shopping.
>
> Example from today's feed: [signal]. That's a 2–3 week window. [link]

**Cadence:** 1 post/day, 5 days a week. Always end with a soft CTA + link to a public
signal page (now shareable — see SEO work). Reply to every comment within the hour.

---

## Outreach DM templates

**Cold DM — recruiters / agencies**
> Hi [name] — I built a tool that flags companies the moment they raise funding or start
> a hiring surge (with the specific roles + who benefits). Thought it'd be useful for
> [agency] targeting [sector]. Want a free personalized feed for your niche? No signup,
> I'll just send you a link.

**Cold DM — B2B sales / founders**
> Hi [name] — quick one. We detect buying-intent + funding + expansion signals for
> [their ICP] and turn each into "here's who to contact and why". I set up a feed for
> [their space] — mind if I send it over? Curious whether the signals match what your
> team chases.

**Follow-up (48h, no reply)**
> No worries if not relevant! Last thing — here's a live example from this week:
> [shareable signal link]. If that's the kind of lead you'd act on, happy to give you
> the full feed free for a month.

**Design-partner ask (after they're using it)**
> You've been in the feed a couple of weeks — what's landed and what's noise? I'm taking
> on a small group of founding customers at £49/mo (locked forever) who help shape it.
> Want in?

---

## What's now built to support this

| Need | Status | Where |
|---|---|---|
| Real accounts (persist interests) | ✅ Magic-link auth | `src/auth.ts`, `/login` |
| Value-first onboarding | ✅ Interest capture → personalized feed | `/onboarding` |
| Retention loop | ✅ Daily email digest (Resend) + cron | `/api/digest/send`, `vercel.json` |
| Shareable/SEO signal links | ✅ OG tags + sitemap + robots | `/signals/[id]`, `sitemap.ts` |

### To go live for real, set these env vars in Vercel
- `AUTH_SECRET` — random 32-byte hex.
- `RESEND_API_KEY` + `DIGEST_FROM` — verified sending domain (so magic links & digests actually send).
- `CRON_SECRET` — so the daily `/api/digest/send` cron is authorized.
- `NEXT_PUBLIC_SITE_URL` — your public/custom domain.

---

## What NOT to do yet
- ❌ Paid ads (you don't know the precise message/ICP yet).
- ❌ Consumer marketing push (low revenue, distracts from validation).
- ❌ New signal categories/features (data *quality* is the bottleneck, not breadth).
