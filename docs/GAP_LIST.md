# Stoki Gap List

Single source of truth for what's still open on Stoki. Committed to git so it syncs across every device that clones or pulls the repo. **Last updated: 2026-07-19.**

Anything not on this list is either shipped or hasn't been thought of yet — if you're planning work, add it here first so it survives context switches.

Cross-referenced with memory files in `~/.claude/projects/.../memory/` for AI-assistant sessions.

---

## ✅ Recently closed (kept for reference — 30-day rolling)

- **2026-07-19** — LinkedIn post #1 (Loyverse comparison) published from `linkedin.com/company/stokiapp`
- **2026-07-19** — `/features` marketing page — commit `ee79288`
- **2026-07-19** — `/about` marketing page (anonymised) — commit `ee79288`
- **2026-07-19** — POPIA data export flow (`/api/account/export` + Settings card) — commit `ee79288`
- **2026-07-19** — Server-action role-gating audit (15 files, shared `role-guards` helper, 14 tests) — commit `e01beae`
- **2026-07-19** — Fastify `/api` workspace — verified already deleted
- **2026-07-19** — Pricing page render fixes ("Contact us" for Enterprise, Live badge clipping) — commit `dd06bfd`
- **2026-07-19** — `/register` canonical route + anonymised trust signal — commit `1471797`
- **2026-07-19** — Onboarding invested-capital step (Panel 5) — commit `e550fd1`
- **2026-07-18** — Invested capital + ROIC feature — commit `b518fd5`
- **2026-07-18** — P1 + P2 language coherence sweep — commits `7cfa1dd`, `2ccba04`
- **2026-07-18** — Pricing page + waitlist backend — commit `8adbac5`
- **2026-07-18** — Sage + iKhokha comparisons + VAT201 guide — commit `f6f98cc`

---

## 📅 Scheduled (specific date)

| # | Item | Target | Notes |
|---|---|---|---|
| 1 | **Ozow payment integration** | ~2026-08-19 | User-decided defer 2026-07-19. Runbook in memory `project_payment_provider.md`. 120-day Business trial covers immediate feature access until then. |

---

## 🔴 Blocked (external dependency)

| # | Item | Blocker |
|---|---|---|
| 2 | **WhatsApp monthly-report Meta template** | Register `stoki_monthly_report` in Meta Business Manager (1-2 business day approval); set `META_MONTHLY_REPORT_TEMPLATE` env var. Then monthly report delivers via WhatsApp too (currently in-app alert + web push only). |
| 3 | **Native SA bank feeds (FNB / Capitec / Standard / ABSA / Nedbank)** | Post-Ozow (~mid-August + ~1 month). Landing chip already says "Soon". |
| 4 | **Phone OTP login** | Twilio not wired in Supabase. Feature-flagged off via `PHONE_OTP_ENABLED = false` in `login/page.tsx`; ~1h to re-enable once Twilio account exists. Runbook in memory `project_phone_otp_deferred.md`. |

---

## 🟡 Deferred with trigger conditions

| # | Item | Trigger to resume |
|---|---|---|
| 5 | **Capacitor.js native app wrapper (iOS + Android)** | Ship any of: 100+ active shops asking "where's the app?", bank/accountant partnership requiring App Store presence, marketing spend >R10k/mo where App Store friction hurts conversion. Full runbook in memory `project_capacitor_evaluation.md`. |

---

## 🟢 Stashed with drafts ready (self-paced)

| # | Item | Where |
|---|---|---|
| 6 | **LinkedIn post #2 — Yoco comparison** | Draft in memory `project_linkedin_comparison_posts.md`. Post ~day 7 after post #1 (so around 2026-07-26). |
| 7 | **LinkedIn post #3 — Xero comparison** | Same file. Post ~day 14 (so around 2026-08-02). |

---

## 🔷 Product polish (small, no blockers)

| # | Gap | Effort |
|---|---|---|
| 8 | Dashboard screenshot on landing page (trust signal) | ~1h once you pick a state to capture |
| 9 | P3 language deeper renames — a few form-field labels still say "Store name" not "Business name" | ~30 min sweep |
| 10 | Receipt component: weighables should print "1.500 kg Rice" not "1.500× Rice" | 15 min |
| 11 | CSV product import for weighables — `parseInt` → `parseFloat` + optional `unit_label` column | 20 min |
| 12 | IndexNow endpoint ergonomics — accept relative paths (`?url=/foo`) in addition to full URLs (currently only full URLs pass validation) | 15 min |

---

## 🟣 Admin / ops / security

| # | Gap | Effort | Priority |
|---|---|---|---|
| 13 | `/admin` delete-user button (Supabase dashboard works today, so low priority) | 10 min | Low |
| 14 | `/admin` send-password-reset button | 15 min | Low |
| 15 | Sentry alerting rules to Slack/email (Sentry captures errors but doesn't notify) | 30 min in Sentry UI | Medium — unknown errors are the worst kind |
| 16 | Bank feed follow-ups from Phase 3B — persist reviewed lines + bulk auto-confirm | 1-2h | Low (blocked until Ozow) |
| 17 | Bluetooth printer follow-ups — persist last-paired + Settings test-print button | 1h | Low |

---

## 🔵 Bot intelligence backlog

| # | Gap | Effort |
|---|---|---|
| 18 | Phase 1.6 — real scrapers for SARB / fuel / CPI (cron slots currently stubbed) | 1 day |
| 19 | Phase 2 — live SA news ingestion (RSS → summariser → advisor context) | 1-2 days |
| 20 | Phase 3 — proactive push insights when indicators move materially (rate hike, fuel +R1/L) | 1 day |
| 21 | Phase 4 — predictive forecasts combining store trends + market data | 3-5 days |

---

## ⚫ Content / SEO backlog

| # | Gap | Effort |
|---|---|---|
| 22 | More comparison pages — SimplePay / Zoho Books / QuickBooks | ~1h each using shared ComparisonPage component |
| 23 | More guides — "How to register for VAT SA" / "PAYE calculation guide" / "Spaza bookkeeping basics" | 2-3h each |
| 24 | `/blog` scaffolding for ongoing content | 2-3h scaffolding, then ongoing |
| 25 | `/status` page (uptime, SaaS-convention trust builder) | 1h |
| 26 | Empty state on `/advisor` for new users — personalise to onboarding-completeness | 30 min |
| 27 | Proper 404 / 500 error pages (Next.js defaults are ugly) | 30 min |
| 28 | Multilingual translations — Zulu / Xhosa / Sotho / Afrikaans (i18n stubs exist; translations don't) | 2-3 days per language (needs a translator + budget) |

---

## 📊 SVP-Product take on the current top

**With Ozow deferred a month + tonight's security/compliance/marketing push landed, the top of the list quietly shifts to marketing + content credibility.** Concrete top-3:

1. **LinkedIn post #2 (Yoco) around 2026-07-26** — 5 min from you, biggest weekly-cadence ROI move
2. **`/status` page + proper 404/500 pages (~2h combined)** — small SaaS-credibility wins new visitors notice
3. **One more comparison page** (SimplePay or QuickBooks, ~1h) — compounds the SEO play while Google's still fresh-crawling the current 5

**Explicitly skip until asked:**
- Bot intelligence Phase 2-4 (nice-to-have, not competitive-necessary)
- Multilingual (needs paid translator)
- Bluetooth printer follow-ups (low usage impact right now)

---

## How to keep this doc current

- **After shipping** anything on this list — move the row into "✅ Recently closed" with the commit hash + date.
- **After receiving** external dependency unblocks (Ozow creds, Meta template approval, Twilio setup) — move the row out of "🔴 Blocked" into the next appropriate section, or straight to "in-progress" if you're picking it up.
- **After a new idea arrives** — add it to the relevant section rather than opening a separate note. This doc is the single git-synced source.
- **Every 4 weeks or so** — prune the "✅ Recently closed" section (keep only the last 30 days) so this file stays scannable.
