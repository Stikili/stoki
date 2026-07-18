import type { SupabaseClient } from '@supabase/supabase-js'
import type { AiTone } from '@/domain/entities/ai-tone'

/**
 * Anomaly detector — nightly cron that spots unusual patterns in the
 * previous 24h of activity relative to a rolling 30-day baseline, then
 * asks the AI to explain each finding in the owner's chosen tone.
 *
 * Detectors are intentionally simple + statistical. Sophistication
 * belongs to the AI explanation layer, not the detection layer:
 *
 *   1. Revenue swing         — yesterday vs 30-day median revenue
 *   2. Expense-category spike — a single category jumped vs its 60-day avg
 *
 * Both directions matter (spike OR crash). "Yesterday was crazy busy" and
 * "yesterday was dead" are equally useful signals for a shop owner.
 *
 * Split responsibilities for testability:
 *   - `detectAnomalies(rows)` — pure statistical detector on injected data
 *   - `buildAnomalyPrompt(a, tone)` — pure prompt builder
 *   - The cron route wires the DB queries + LLM call
 */

export type AnomalyKind = 'revenue_spike' | 'revenue_crash' | 'expense_spike'

export interface Anomaly {
  kind: AnomalyKind
  /** Store-facing headline used for the push title. Tone-neutral (the AI
   *  fills the tone in the body). */
  headline: string
  /** Machine-readable numbers the AI prompt feeds off. Never surface these
   *  directly — always via the AI translation layer. */
  facts: Record<string, string | number>
  /** Severity 1-3 used to break ties when a store has more than
   *  MAX_ALERTS_PER_STORE_PER_DAY worth of anomalies. */
  severity: 1 | 2 | 3
}

export interface RevenueSample {
  /** YYYY-MM-DD (local). */
  date: string
  revenue: number
}

export interface ExpenseSample {
  /** YYYY-MM-DD (local). */
  date: string
  category: string
  amount: number
}

/** Revenue outside this range vs 30-day median triggers an alert. */
export const REVENUE_LOW_MULT = 0.5   // yesterday < 50% of median = crash
export const REVENUE_HIGH_MULT = 2.0  // yesterday > 200% of median = spike
export const EXPENSE_SPIKE_MULT = 1.5 // today's category > 150% of 60-day avg
export const MIN_MEDIAN_FOR_ALERT = 100 // R100 — below this the ratios are noise
export const MIN_BASELINE_DAYS = 7    // need at least a week of history to compare

/**
 * Given yesterday's + rolling-baseline data, return the anomalies worth
 * alerting on. Ranked by severity descending; caller may cap.
 */
export function detectAnomalies(
  yesterday: { date: string; revenue: number; expensesByCategory: Record<string, number> },
  baseline: {
    /** Last 30 days of daily revenue (excluding yesterday). */
    dailyRevenue: RevenueSample[]
    /** Last 60 days of daily expense entries. */
    expenses: ExpenseSample[]
  },
): Anomaly[] {
  const found: Anomaly[] = []

  // --- Revenue swing --------------------------------------------------
  if (baseline.dailyRevenue.length >= MIN_BASELINE_DAYS) {
    const median = medianOf(baseline.dailyRevenue.map(r => r.revenue))
    if (median >= MIN_MEDIAN_FOR_ALERT) {
      if (yesterday.revenue < median * REVENUE_LOW_MULT) {
        found.push({
          kind: 'revenue_crash',
          headline: 'Yesterday was much slower than usual',
          facts: {
            yesterdayRevenue: yesterday.revenue,
            usualRevenue: round(median),
            downByPct: pct((median - yesterday.revenue) / median),
          },
          severity: 3,
        })
      } else if (yesterday.revenue > median * REVENUE_HIGH_MULT) {
        found.push({
          kind: 'revenue_spike',
          headline: 'Yesterday was your busiest in weeks',
          facts: {
            yesterdayRevenue: yesterday.revenue,
            usualRevenue: round(median),
            upByPct: pct((yesterday.revenue - median) / median),
          },
          severity: 2,
        })
      }
    }
  }

  // --- Expense category spike ----------------------------------------
  // For each category in yesterday's expenses, compare its total to the
  // 60-day daily average for that category. Alert when today's single-day
  // total exceeds 1.5x that average AND yesterday's day-total > R100
  // (to filter out "your daily airtime expense of R5 tripled to R15" noise).
  const byCat = groupByCategory(baseline.expenses)
  for (const [cat, todayAmount] of Object.entries(yesterday.expensesByCategory)) {
    if (todayAmount < MIN_MEDIAN_FOR_ALERT) continue
    const history = byCat.get(cat) ?? []
    if (history.length < MIN_BASELINE_DAYS) continue
    const dailyAvg = sum(history.map(h => h.amount)) / 60
    if (dailyAvg <= 0) continue
    if (todayAmount > dailyAvg * EXPENSE_SPIKE_MULT) {
      found.push({
        kind: 'expense_spike',
        headline: `Big ${cat} spend yesterday`,
        facts: {
          category: cat,
          yesterdayAmount: round(todayAmount),
          usualDailyAmount: round(dailyAvg),
          upByPct: pct((todayAmount - dailyAvg) / dailyAvg),
        },
        severity: 1,
      })
    }
  }

  return found.sort((a, b) => b.severity - a.severity)
}

/**
 * Build the LLM prompt that turns an Anomaly (numbers) into a 1-2 sentence
 * message in the owner's tone. Pure function — caller wires the LLM.
 */
export function buildAnomalyPrompt(a: Anomaly, tone: AiTone): { system: string; user: string } {
  const system = `You are Stoki's anomaly explainer. You get ONE anomaly and turn it into a short WhatsApp-friendly message for the shop owner.

TONE — the owner picked "${tone}":
- casual: kasi vibe, "howzit boss", allowed sparingly; no jargon.
- plain: everyday SA English; no jargon. Say "money you took in" not "revenue".
- professional: polite business tone; standard English; some retail terms.
- technical: full accounting language — GP, revenue, cash flow — acceptable.

Rules — non-negotiable:
- 1 to 2 short sentences. This is a push notification body.
- Rands (R) with two decimals when quoting money.
- Do not invent numbers — use ONLY what the facts block gives you.
- Do not offer generic advice like "keep going". If you have a suggestion, make it concrete and short (e.g. "check if a supplier delivery was double-charged").
- Do NOT name the tone in the output. USE it.
- No emoji, no headings, no bullets.`

  const user = `Anomaly type: ${a.kind}
Headline: ${a.headline}
Facts:
${Object.entries(a.facts).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

Write the ${tone}-tone message. 1-2 sentences.`

  return { system, user }
}

// --- helpers ---------------------------------------------------------

function medianOf(xs: number[]): number {
  if (xs.length === 0) return 0
  const sorted = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function sum(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0)
}

function round(n: number, dp = 2): number {
  const f = Math.pow(10, dp)
  return Math.round(n * f) / f
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`
}

function groupByCategory(rows: ExpenseSample[]): Map<string, ExpenseSample[]> {
  const m = new Map<string, ExpenseSample[]>()
  for (const r of rows) {
    const list = m.get(r.category) ?? []
    list.push(r)
    m.set(r.category, list)
  }
  return m
}
