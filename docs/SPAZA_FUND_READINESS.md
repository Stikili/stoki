# Spaza Fund readiness flow — design

Free WhatsApp flow that tells a spaza owner whether they can successfully apply to the **Spaza Shop Support Fund**, what is missing, and how to fix it.

**Status:** scoped, not built. **Last updated: 2026-08-30.**

---

## 1. The one thing to get right

This is a **readiness assessment**, not a verification service. The distinction is not pedantic — it decides what we can build and what we are allowed to claim.

| Requirement | Can we verify it programmatically? | Reality |
|---|---|---|
| Municipal registration / licence | **No** | Issued per-municipality under the Business Act 71 of 1991 across ~257 municipalities. No national register, no API. Nothing exists to query. |
| CIPC registration | **Yes, but paid** | Real APIs exist (Datanamix, Standard Bank SearchWorks, WinDeed). Commercial agreement + per-lookup cost. Out of scope for sprint 1. |
| SARS registration | **No** | Tax Compliance Status works via an eFiling-generated TCS PIN the taxpayer hands to a third party. No arbitrary-lookup API. |
| UIF | **No** | uFiling has no public API. (See §3 — UIF probably shouldn't be in this flow at all.) |

So the flow **asks, validates format, scores, and instructs**. It never asserts that a document is genuine or that an application will succeed.

**Safety rule, non-negotiable:** we never tell someone they are "approved-ready". These are people applying for money they need; a false green light costs them a funding round and costs us trust we cannot rebuy. Language is always *"here is what's missing"*, never *"you're good to go"*.

---

## 2. Why now

As at 31 July 2026 the fund had 5,327 complete applications, 5,064 assessed, and only **1,386 approved at R83.9m** against a R500m pot. Disbursements sat at R57m. **38% of applications lacked valid licences or permits**, and DSBD named municipal licensing assistance as one of its three immediate priorities.

The gap is not demand and not money. It is paperwork. That is a software problem.

**Caveat on the R320m framing:** R500m − R179.6m allocated = ~R320m unallocated, but that is not *all* blocked by licensing. Do not put "licensing is blocking R320m" in marketing copy — it overstates a real point that is strong enough without inflation.

---

## 3. Actual eligibility criteria

From the fund's own eligibility page (verified 2026-08-30). **These differ from the assumptions in the original proposal — read this section before building.**

| Criterion | Requirement | Hard gate? |
|---|---|---|
| Citizenship | SA citizen, or naturalised **before 1994** | **Yes** |
| Location | Rural or township area, within SA | **Yes** |
| Municipal registration | Registered with the local municipality per its by-laws | **Yes — and this is the 38% blocker** |
| SARS | Valid SARS registration, **or** qualify for a 6-month transition period | Soft |
| CIPC | **Optional below R80,000.** Required within 6 months above R80,000 | **Conditional on amount requested** |
| Active management | Owner must actively manage the shop | Yes (attested) |
| Excluded | Alcohol sales; non-business/personal costs | Yes |

Priority groups: youth (18–35), women, people with disabilities.

**Three corrections to the original proposal:**

1. **UIF does not appear in the eligibility criteria.** Do not build a UIF check. If it belongs anywhere it is general compliance advice, not fund readiness.
2. **CIPC is not a gate for most applicants.** Below R80k it is optional. Asking for it up front will make people think they are ineligible when they are not — actively harmful given the problem we are solving.
3. **SARS has a transition period.** "No SARS number" is not a stop; it is a six-month clock.

**Still unverified:** the fund pages do not publish a document-by-document submission checklist. Before building §7, confirm the actual list via the SEFA SMME portal or by phoning the fund (011 305 8080). **Do not infer the checklist from the criteria** — a doc pack that omits a required form is worse than no doc pack.

---

## 4. Architecture fit

The WhatsApp surface is **LLM + tool use** (`lib/whatsapp-brain.ts`), not a step-driven state machine. Conversation history already persists via `lib/advisor/conversations.ts`.

So this should ship as **tools plus a persisted record**, not a hardcoded wizard. The model already handles digression, re-asking, and code-switching between languages; a rigid flow would fight it and would break the moment someone answers two questions at once.

New tools on the existing `buildAllTools` registry:

- `get_fund_readiness` — current record + computed score and gaps
- `record_fund_answer` — persist one answer (validated first)
- `get_fund_requirement_help` — guidance for one gap, municipality-aware where we have data

The system prompt gains a short block: what the fund is, that readiness is assessed not verified, and the standing instruction never to claim approval-readiness.

---

## 5. Data model — migration `042_spaza_fund_readiness.sql`

One row per store.

```
spaza_fund_readiness
  store_id              uuid pk references stores(id) on delete cascade
  citizenship_ok        boolean            -- attested, not verified
  naturalised_pre_1994  boolean
  municipality          text               -- free text + fuzzy-matched to our list
  municipal_registered  boolean
  municipal_ref         text               -- format-validated only
  sars_registered       boolean
  sars_ref              text               -- 10 digits, format-validated only
  cipc_registered       boolean
  cipc_ref              text               -- YYYY/NNNNNN/NN
  amount_sought         numeric(12,2)      -- drives whether CIPC is required
  actively_managed      boolean
  sells_alcohol         boolean            -- disqualifying
  in_township_or_rural  boolean
  priority_group        text[]             -- youth | woman | disability
  completed_at          timestamptz
  created_at/updated_at timestamptz
```

RLS: store members read/write their own row; admin client for the bot. Mirrors `market_indicators`.

**Every field is self-reported.** Column comments must say so, so nobody downstream mistakes this for verified data.

---

## 6. Validators — `lib/spaza-fund/validators.ts`

Pure functions, fully unit-tested, no network. This is the sprint's most testable surface and should be built first.

- `validateSaIdNumber(id)` — 13 digits, **Luhn checksum**, valid embedded date, plausible DOB. Also yields age for the youth-priority flag and gender digit for the women-priority flag, so one input answers three questions.
- `validateCipcNumber(ref)` — `YYYY/NNNNNN/NN`, year not in the future.
- `validateSarsNumber(ref)` — 10 digits, leading digit in the valid set.
- `scoreReadiness(record)` → `{ status, gaps[], blockers[] }` where status ∈ `not_started | gaps | ready_to_submit`. **No `approved` state exists** — see §1.

Scoring rules that matter: alcohol sales or failed citizenship are **blockers** (stop, explain, don't score). Missing CIPC is only a gap when `amount_sought > 80000`. Missing SARS is a gap with a transition note, never a blocker.

---

## 7. Doc pack

Generated PDF, sent as a WhatsApp document message. Reuses the existing PDF approach from invoices/reports.

Contents: their readiness summary; per-gap "what to do, where to go, what to bring"; the municipal office for their municipality where we have it; and the fund's own contact details. **Not** a pre-filled application — we are not submitting on anyone's behalf.

Blocked on §3's unresolved document checklist.

---

## 8. Municipal content

The real cost. ~257 municipalities, each with its own by-laws and process.

**Start with the eight metros** — Johannesburg, Tshwane, Ekurhuleni, eThekwini, Cape Town, Nelson Mandela Bay, Buffalo City, Mangaung — which cover the bulk of township density. Everyone else gets generic guidance plus "contact your local municipal offices", stated honestly as generic.

Data lives in a typed constant, not the database — it changes rarely and belongs in review.

---

## 9. Sprint scope

**In:** migration, validators + tests, three tools, prompt block, readiness scoring, text-based summary over WhatsApp, metro municipal data.

**Out:** the PDF doc pack (blocked on §3), CIPC API integration (paid, needs procurement), any claim of verification, application submission, non-metro municipal detail.

That is a defensible sprint. The original row's "licence check, CIPC/SARS/UIF status" is not — three of those four cannot be checked, and one shouldn't be asked.

---

## 10. Open decisions

1. **Free forever, or trial hook?** Argues for free: it is an acquisition funnel and a goodwill play against a real national problem. Argues against: it is real support cost with no revenue.
2. **Positioning.** Stoki is positioned for all SA SMMEs; this is deliberately spaza-specific. Fine as a *feature*, but it should not pull the top-level positioning toward shop-only.
3. **The window.** Approvals are slow and the fund may close or change terms. Worth a check on fund status before sprint start — building for a closed fund is the main strategic risk.
