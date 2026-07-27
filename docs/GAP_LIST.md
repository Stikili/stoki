# Stoki Gap List

Single source of truth for what's still open on Stoki. Committed to git so it syncs across every device that clones or pulls the repo. **Last updated: 2026-07-27.**

Anything not on this list is either shipped or hasn't been thought of yet — if you're planning work, add it here first so it survives context switches.

Cross-referenced with memory files in `~/.claude/projects/.../memory/` for AI-assistant sessions.

---

## ✅ Recently closed (kept for reference — 30-day rolling)

**2026-07-27:**
- **LinkedIn post #2 (Yoco) published** from `linkedin.com/company/stokiapp` — "one app for the whole business" opener, less-Yoco-focused variant. Post spacing: 8 days after post #1 (in the 5-7d ideal window, one day late)
- **Landing 3-col footer redesign** — CTA slide got a standard Stripe/Vercel/Linear-style footer: Product / Resources / Compare Stoki columns with uppercase small-caps headers, bottom divider with reg-line + Privacy/Terms. Mail us + Follow us pills demoted to text links inside Resources. Container widened `max-w-md` → `max-w-4xl`, CTA card stays narrow via nested wrapper — commit `5d08827`
- **Landing "Made in Cape Town" removed** — swept from Landing CTA + Status + About + Features footers in one pass. Founder-anonymity constraint (city = founder location) — commit `83dc968`
- **Landing hero — split-screen redesign** — desktop: two-column grid with copy left / phone screenshot right (Linear/Vercel/Notion pattern). Mobile: text-only hero (viewport-height kept for swipe deck) + a 4:3 landscape crop of the dashboard header at the top of Slide 2. Multiple iterations before landing on this — commits `3cd6870` (split hero) and `d0e99a3` (mobile 4:3 crop)
- **Dashboard screenshot on landing** — user captured a Kagiso Kwikstop demo dashboard (R60 revenue, 3 sales, 1 credit customer owing R18) — commit `5d79fbe`

**2026-07-19 (evening batch):**
- `/status` public trust-signal page — commit `477a3b0`
- `app/not-found.tsx` — branded 404 with 3 next-step CTAs — `477a3b0`
- `app/error.tsx` — branded 500 with Sentry-captured digest + reset — `477a3b0`
- `/compare/stoki-vs-simplepay` — 5th comparison page — `477a3b0`
- `/compare/stoki-vs-zoho-books` — 6th comparison — `71d38a7`
- `/compare/stoki-vs-quickbooks` — 7th comparison — `71d38a7`
- `/admin` delete-user button (with typed-DELETE confirmation) — `71d38a7`
- `/admin` send-password-reset button — `71d38a7`
- Receipt weighables: "1.500 kg Rice" not "1.500× Rice" — shared `formatReceiptQtyLabel` across JSX + text + escpos bytes — `477a3b0`
- CSV product import: `parseFloat` for qty + optional `unit_label` column + 6 new tests — `477a3b0`
- IndexNow relative-path fix: `normaliseCanonicalUrl` accepts full URLs OR `/paths` OR www subdomain — `477a3b0`
- Language rebalance: **spaza + SMME restored** as crucial persona anchors after user directive; landing badge + Free tier subtitle both restored — `477a3b0`

**2026-07-19 (afternoon):**
- LinkedIn post #1 (Loyverse comparison) published from `linkedin.com/company/stokiapp`
- `/features` marketing page (60+ features, ItemList JSON-LD) — `ee79288`
- `/about` marketing page (anonymised) — `ee79288`
- POPIA data export flow (`/api/account/export` + Settings card) — `ee79288`
- Server-action role-gating audit (15 files, shared `role-guards` helper, 14 tests) — `e01beae`
- Fastify `/api` workspace — verified already deleted
- Pricing page render fixes ("Contact us" for Enterprise, Live badge clipping) — `dd06bfd`
- `/register` canonical route + anonymised trust signal — `1471797`
- Onboarding invested-capital step (Panel 5) — `e550fd1`

**2026-07-18:**
- Invested capital + ROIC feature — `b518fd5`
- P1 + P2 language coherence sweep — `7cfa1dd`, `2ccba04`
- Pricing page + waitlist backend — `8adbac5`
- Sage + iKhokha comparisons + VAT201 guide — `f6f98cc`

---

## 📅 Scheduled (specific date)

| # | Item | Target | Notes |
|---|---|---|---|
| 1 | **Ozow payment integration** | ~2026-08-19 | User-decided defer. Runbook in memory `project_payment_provider.md`. 120-day Business trial covers immediate access. |

---

## 🔴 Blocked (external dependency)

| # | Item | Blocker |
|---|---|---|
| 2 | **WhatsApp monthly-report Meta template** | Register `stoki_monthly_report` in Meta Business Manager (1-2 day approval) |
| 3 | **Native SA bank feeds (5 banks)** | Post-Ozow (~mid-August + ~1 month) |
| 4 | **Phone OTP login** | Twilio not wired in Supabase (feature-flagged off) |
| 5 | **Sentry alerting rules** | Configured in Sentry UI (not codebase) — needs your setup |
| 6 | **Multilingual translations** — Zulu / Xhosa / Sotho / Afrikaans | Needs paid translator |

---

## 🟡 Deferred with trigger conditions

| # | Item | Trigger to resume |
|---|---|---|
| 7 | **Capacitor.js native app wrapper (iOS + Android)** | 100+ shops OR bank partnership requiring App Store OR >R10k/mo marketing spend |

---

## 🟢 Stashed with drafts ready (self-paced)

| # | Item | Where |
|---|---|---|
| 8 | **LinkedIn post #3 — Xero comparison** | Draft in memory `project_linkedin_comparison_posts.md`. Post ~2026-08-03 (7 days after Yoco post) |

---

## 🔷 Product polish (small, no blockers)

| # | Gap | Effort |
|---|---|---|
| 10 | P3 language deeper renames — a few form-field labels still say "Store name" not "Business name" | ~30 min sweep |

---

## 🟣 Admin / ops

| # | Gap | Effort | Priority |
|---|---|---|---|
| 11 | **Advisor empty state** for new users — personalise to onboarding-completeness | 30 min | Low — INTRO message works |
| 12 | Bank feed follow-ups from Phase 3B — persist reviewed lines + bulk auto-confirm | 1-2h | Low (blocked until Ozow) |
| 13 | Bluetooth printer follow-ups — persist last-paired + Settings test-print button | 1h | Low |

---

## 🔵 Bot intelligence backlog (multi-day builds — dedicated session recommended)

| # | Gap | Effort |
|---|---|---|
| 14 | **Phase 1.6** — real scrapers for SARB / fuel / CPI (cron slots currently stubbed) | 1 day |
| 15 | **Phase 2** — live SA news ingestion (RSS → summariser → advisor context) | 1-2 days |
| 16 | **Phase 3** — proactive push insights when indicators move materially | 1 day |
| 17 | **Phase 4** — predictive forecasts combining store trends + market data | 3-5 days |

---

## ⚫ Content / SEO backlog

| # | Gap | Effort |
|---|---|---|
| 18 | **`/blog` scaffolding + first post** — ongoing content channel | 2-3h scaffolding, then ongoing |
| 19 | **Guide — "How to register for VAT in South Africa"** | 2-3h |
| 20 | **Guide — "PAYE calculation guide"** | 2-3h |
| 21 | **Guide — "Spaza bookkeeping basics"** | 2-3h |

---

## 📊 SVP-Product take on the current top

**Yoco post shipped 2026-07-27; landing hero + footer redesigned.** New top-3:

1. **Bot intelligence Phase 1.6 — real SARB / fuel / CPI scrapers** (1 day, dedicated session) — highest-leverage upgrade to the AI advisor's factual grounding. Currently the cron pulls placeholders; real live data makes the AI meaningfully sharper. **Actively being scoped 2026-07-27.**
2. **LinkedIn post #3 (Xero) — post ~2026-08-03** (7 days after Yoco post). Zero code, draft in `memory/project_linkedin_comparison_posts.md`.
3. **`/blog` scaffolding + first post** (2-3h) — content channel for ongoing SEO compounding. Now that 7 comparison pages + 1 guide are indexed, a blog + fresh posts keeps the crawl-frequency + backlink flow going.

**Explicitly skip until asked:**
- Bot intelligence Phase 4 (predictive forecasts) — nice-to-have, 3-5 days
- Multilingual translations — needs paid translator
- Bluetooth printer follow-ups — low usage impact
- Sentry alert rules — configure via Sentry's own UI, not code

---

## How to keep this doc current

- **After shipping** anything on this list — move the row into "✅ Recently closed" with the commit hash + date.
- **After receiving** external dependency unblocks (Ozow creds, Meta template approval, Twilio setup) — move the row out of "🔴 Blocked" into the next appropriate section.
- **After a new idea arrives** — add it to the relevant section rather than opening a separate note. This doc is the single git-synced source.
- **Every 4 weeks or so** — prune the "✅ Recently closed" section (keep only the last 30 days) so this file stays scannable.
