# Stoki Gap List

Single source of truth for what's still open on Stoki. Committed to git so it syncs across every device that clones or pulls the repo. **Last updated: 2026-08-05.**

Anything not on this list is either shipped or hasn't been thought of yet — if you're planning work, add it here first so it survives context switches.

Cross-referenced with memory files in `~/.claude/projects/.../memory/` for AI-assistant sessions.

---

## ✅ Recently closed (kept for reference — 30-day rolling)

**2026-08-30:**
- **`/blog` shipped** — index + post routing + Article/Blog/BreadcrumbList JSON-LD, following the `ComparisonPage` house pattern (data schema + shared renderer, consumer owns content only). No MDX: it would add a build dependency, a second styling system, and content typecheck can't see. Sitemap now **derives blog URLs from the post registry**, so publishing needs no second edit to get crawled. Blog links added to both footers — commit `833bf75`
- **First post — "SA small business cost report, August 2026"** — built on the figures Stoki already ingests (SARB WebIndicators API + DMRE fuel). Angle: diesel now costs *more* than petrol (R26.16 vs R25.58 inland) because petrol got a slate-levy cut diesel didn't, so "petrol drops 52c" was the opposite of good news for anyone moving goods. **Repeatable by construction** — DMRE adjusts the first Wednesday monthly and the inputs are already in the DB — commit `833bf75`
- **Guide dead-end closed** — a reader landing on the VAT201 guide from LinkedIn now has somewhere to go next

**2026-08-13:**
- **LinkedIn post #4 published** — first non-comparison post, a ~70-word paragraph driving to the indexed `/guides/how-to-submit-vat201-south-africa` page ("Most VAT201 mistakes we see aren't fraud — they're admin"). No IndexNow ping: the guide content hasn't changed since `64e758c`. Cadence data point — actual spacing across #1→#4 is 8, 9, 8 days, so plan against ~8-9 days rather than the 5-7 in the original plan

**2026-08-06:**
- **Bot intelligence Phase 1.6 shipped** — SARB repo, prime and CPI now refresh live from the SARB's own JSON API (`custom.resbank.co.za/SarbWebApi/WebIndicators/HomePageRates`). The planned cheerio/pdf-parse scrapers were abandoned after live probing: the plan's SARB URL 404s, and both the replacement rate pages and AA.co.za render values client-side. One official JSON call replaced two planned parsers. Matches on `TimeseriesCode` not display name (SARB relabelled "repo rate" → "SARB Policy Rate"), and reads prime rather than deriving repo + 3.5. 11 tests against a verbatim live fixture — commit `c665544`
- **Fuel scraping declined, deliberately** — the AA-vs-DMRE decision is moot; neither is machine-readable. Fuel stays owner-maintained on `/settings/market`, updated after the DMRE's first-Wednesday adjustment. A silently-broken parser feeding the advisor wrong R/L figures is worse than a stale number the owner can see
- **BASELINE constants refreshed** — repo/prime were still correct at 7.00/10.50, but **diesel was 20% off** (21.80 → 26.16), petrol 23.50 → 25.58, CPI 4.5 → 5.0, FX fallback 18.40 → 16.39 — commit `c665544`

**2026-08-05:**
- **LinkedIn post #3 (Xero) published** from `linkedin.com/company/stokiapp` — brief ~110-word variant leading with "Depends on who runs your books", no Xero rand figure quoted (2026 repricing unverified). **Completes the 3-post comparison series** (Loyverse → Yoco → Xero). Posted 9 days after the Yoco post, 2 days past the 5-7 day target window
- **VAT201 guide render bug fixed** — five backslash-apostrophe sequences sat in JSX *text* nodes on `/guides/how-to-submit-vat201-south-africa`, so the live page rendered "your bank\'s SARS payment option" with a visible backslash. These were also the 12 eslint errors that had **kept master's CI red since 2026-07-29** (`5461ff2` pulled the file into lint scope). Replaced with typographic quotes — commit `64e758c`
- **Xero comparison refreshed** — Xero retired Starter/Standard/Premium in 2026 for Ignite/Grow/Comprehensive/Ultimate, and SA rand pricing moved off the ~R305/R515/R840 the page quoted. Page now states Stoki pricing concretely (Free / R99 / R249) and Xero's structurally, pointing at xero.com/za for live figures. Added a "Free tier" row (Xero has none) and removed the FAQ paragraph that claimed 3-4x, "under half" and "a third" of the same number — commit `64e758c`
- **`packageManager` pin corrected** — root `package.json` declared `pnpm@11.18.0` (`207712f`) but the repo is npm workspaces with a `package-lock.json` and CI runs `npm ci`; no `pnpm-lock.yaml` exists. The pin also required Node ≥22.13 against a Node 20 toolchain, so any corepack-aware pnpm call failed outright. Repinned to `npm@10.8.2` — commit `64e758c`

**2026-07-29 to 07-31 (marketing polish run):**
- **Shared Header/Footer + `(marketing)` route group** — marketing pages consolidated under one layout — `5461ff2`
- **`/privacy` + `/terms` metadata**, breadcrumb 404s dropped — `b2ec428`
- **Primary CTAs standardised** on `btn-gloss` + `rounded-2xl` across marketing — `46aafde`
- **Cape Town scrub, full pass** — 8 sites, founder-anonymity sweep completed — `348cfa2`
- **`/features` redesign** — icon per feature + category layout — `7160e41`
- **Landing header fixes** — flex+absolute nav so CTAs hug right on mobile; theme-toggle matched to sign-in button — `b951f33`, `efc3c3a`
- **Compare CTA fix** — pointed at `/register` (was `/login`) + keyword typo — `b5967f5`

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
| 1 | **Ozow — sandbox + live cutover** | Blocked on credentials | See row 1b. Everything past code-complete needs real keys. |

---

## 🔴 Blocked (external dependency)

| # | Item | Blocker |
|---|---|---|
| 1b | **Ozow merchant credentials** — `OZOW_SITE_CODE`, `OZOW_PRIVATE_KEY`, `OZOW_API_KEY` | ⚠️ **Confirmed blocker 2026-08-13.** Merchant onboarding recorded as in progress since 2026-07-18 — **26 days**, against a runbook expectation of same-day approval for SA registered entities. That gap suggests a stalled document request rather than a queue; worth chasing Ozow directly. Nothing else unblocks this, and the ~2026-08-19 target cannot hold without it. Note: credentials block sandbox testing and go-live, NOT writing the integration. |
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
| 8 | **LinkedIn post #5 — cost report** | Ready: post the August cost report (`/blog/sa-small-business-cost-report-august-2026`). Lead on the counterintuitive line — *diesel now costs more than petrol*. **Do ping IndexNow for this one** — unlike post #4, the URL is genuinely new. Recurring from here: one post per cost report, monthly. |

---

## 🔷 Product polish (small, no blockers)

| # | Gap | Effort |
|---|---|---|
| 10 | P3 language deeper renames — a few form-field labels still say "Store name" not "Business name" | ~30 min sweep |
| 10b | **Confirm Xero's live SA ZAR pricing** and put real figures back into `/compare/stoki-vs-xero` — xero.com 503s to automated fetches, so this needs a manual browser check. One SA source suggests the entry tier is now ~R450/mo (was ~R305) | 15 min |
| 10c | Three remaining eslint warnings — unused `SupabaseClient` import in `anomaly-detect.ts`, unused `toPayslipLine` in `PayrollRepository.ts`, stale eslint-disable in `error.tsx`. Non-blocking (CI passes on warnings) | 10 min |

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
| 14a | **Sentry N-day null-streak alert** — warn when a market indicator returns null 3 days running. The cron's `attempted[]` output already reports per-kind failures, so the hook point exists. Left over from Phase 1.6 | 30 min |
| 14b | **`docs/BOT_INTELLIGENCE.md`** — design doc for the market-data layer, never scaffolded. Left over from Phase 1.6 | 1h |
| 14c | **Phase 1.7** — `web_search` tool for the in-app advisor. WhatsApp brain has `WEB_SOURCE_ALLOWLIST`; `/api/advisor` has no equivalent | 4-6h |
| 14d | **Watch: SARB may retire the prime lending rate** — they've published a consultation paper on it. If prime is discontinued, `sarb_prime` needs a story | monitor |
| 15 | **Phase 2** — live SA news ingestion (RSS → summariser → advisor context) | 1-2 days |
| 16 | **Phase 3** — proactive push insights when indicators move materially | 1 day |
| 17 | **Phase 4** — predictive forecasts combining store trends + market data | 3-5 days |

---

## ⚫ Content / SEO backlog

| # | Gap | Effort |
|---|---|---|
| 18 | ~~`/blog` scaffolding~~ — **shipped 2026-08-30** (`833bf75`). To publish: add a module under `content/blog/`, register its `meta` in `content/blog/index.ts`, add the thin route file. Sitemap is automatic. | done |
| 19 | **Guide — "How to register for VAT in South Africa"** | 2-3h |
| 20 | **Guide — "PAYE calculation guide"** | 2-3h |
| 21 | **Guide — "Spaza bookkeeping basics"** | 2-3h |

---

## 📊 SVP-Product take on the current top

**Phase 1.6 shipped; comparison-post series complete; CI unblocked 2026-08-06.** New top-3:

1. **Ozow** — credentials expected 2026-08-31. Adapter only, not a billing build (see `project_payment_provider.md` pre-work findings). Start when keys land.
2. **First Wednesday of every month is now the operating rhythm** — DMRE adjusts fuel, which triggers three things at once: update `/settings/market` (fuel is owner-maintained, not scraped), publish the month's cost report, post it to LinkedIn. Next: **2026-09-02**. This single cadence closes the fuel-rot risk and the content-cadence problem together.
   - Backed by a weekly cloud routine, `trig_01W2gqgoqSbGa3csUFd1qWKz` (Mondays 08:00 SAST) — checks whether the current month's report exists and reports published / upcoming / overdue. Read-only. Manage at https://claude.ai/code/routines
3. **Confirm Xero's live SA pricing** (15 min, item 10b) — the comparison page currently avoids naming a Xero figure because it couldn't be verified. A concrete number materially strengthens both the page and any future post referencing it.

**Process note (2026-08-05):** master's CI sat red for a week without anyone noticing, and a public page shipped a visible render bug for the same period. Worth wiring a CI failure notification — a GitHub Actions email/Slack hook, or a `gh run list` check at the start of each session. `gh` CLI is not currently installed on the dev machine.

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
