import { NextResponse } from 'next/server'
import LLMClient from '@anthropic-ai/sdk'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import {
  alreadyAlertedRecently, authoriseCron, configureVapid, fetchAllStoreIds,
  fetchAllSubscriptions, sendAndPersist,
} from '@/lib/push-helpers'
import { LLM_API_KEY, LLM_MODEL_FAST } from '@/lib/llm-config'
import {
  buildAnomalyPrompt,
  detectAnomalies,
  type Anomaly,
  type ExpenseSample,
  type RevenueSample,
} from '@/lib/anomaly-detect'
import { isValidAiTone, DEFAULT_AI_TONE } from '@/domain/entities/ai-tone'
import { log } from '@/lib/log'

/**
 * F-P-11 — Anomaly Detection (AI-explained).
 *
 * Nightly cron. For every store:
 *   1. Load yesterday's revenue + today's-so-far expenses
 *   2. Load 30-day rolling baseline (revenue) + 60-day baseline (expenses)
 *   3. Run pure `detectAnomalies` → list of statistically-flagged findings
 *   4. Take top MAX_PER_STORE, ask AI to explain each in the store's tone
 *   5. Deliver via push + in-app alert (marker '[F-P-11]', 24h dedup)
 *
 * Cron schedule: 30 8 * * * (08:30 UTC = 10:30 SAST). Well after other
 * morning pushes; captures owners mid-morning when they check the phone.
 */

const MAX_PER_STORE = 2
const FEATURE_MARKER = '[F-P-11]'
const DEDUP_WINDOW_HOURS = 20

export async function POST(req: Request) {
  if (!authoriseCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!LLM_API_KEY) return NextResponse.json({ error: 'LLM not configured', delivered: 0 })

  configureVapid()
  const supabase = createAdminClient()
  const ai = new LLMClient({ apiKey: LLM_API_KEY })

  const storeIds = await fetchAllStoreIds(supabase)
  if (storeIds.length === 0) return NextResponse.json({ evaluated: 0, delivered: 0 })

  const subs = await fetchAllSubscriptions(supabase)

  // Yesterday and rolling-baseline windows (server-time, UTC).
  const now = new Date()
  const yesterdayStart = new Date(now); yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1); yesterdayStart.setUTCHours(0, 0, 0, 0)
  const yesterdayEnd = new Date(yesterdayStart); yesterdayEnd.setUTCHours(23, 59, 59, 999)
  const baseline30Start = new Date(yesterdayStart); baseline30Start.setUTCDate(baseline30Start.getUTCDate() - 30)
  const baseline60Start = new Date(yesterdayStart); baseline60Start.setUTCDate(baseline60Start.getUTCDate() - 60)

  let delivered = 0
  let evaluated = 0
  for (const storeId of storeIds) {
    evaluated++
    try {
      if (await alreadyAlertedRecently(supabase, storeId, FEATURE_MARKER, DEDUP_WINDOW_HOURS)) continue

      const yesterday = await loadDay(supabase, storeId, yesterdayStart, yesterdayEnd)
      const baselineRevenue = await loadDailyRevenue(supabase, storeId, baseline30Start, yesterdayStart)
      const baselineExpenses = await loadDailyExpenses(supabase, storeId, baseline60Start, yesterdayStart)

      const anomalies = detectAnomalies(yesterday, {
        dailyRevenue: baselineRevenue,
        expenses: baselineExpenses,
      }).slice(0, MAX_PER_STORE)

      if (anomalies.length === 0) continue

      // Read tone once per store — cheap; avoids doing it inside the loop.
      const { data: storeRow } = await supabase
        .from('stores')
        .select('name, ai_tone, whatsapp_number')
        .eq('id', storeId)
        .single()
      const storeName = (storeRow?.name as string) ?? 'Your store'
      const tone = isValidAiTone(storeRow?.ai_tone) ? storeRow.ai_tone : DEFAULT_AI_TONE

      for (const a of anomalies) {
        const explanation = await explainAnomaly(ai, a, tone)
        if (!explanation) continue

        await sendAndPersist(
          supabase, storeId, subs,
          { title: `${storeName} — ${a.headline}`, body: explanation, url: '/alerts' },
          'ai_insight',
          `${FEATURE_MARKER} ${a.kind}: ${explanation}`,
        )
        delivered++
      }
    } catch (e) {
      log.error('cron.anomaly_detection.store_failed', { storeId, error: e })
    }
  }

  log.info('cron.anomaly_detection.done', { evaluated, delivered })
  return NextResponse.json({ evaluated, delivered })
}

export async function GET(req: Request) { return POST(req) }

async function explainAnomaly(ai: LLMClient, a: Anomaly, tone: string): Promise<string> {
  const { system, user } = buildAnomalyPrompt(a, isValidAiTone(tone) ? tone : DEFAULT_AI_TONE)
  const response = await ai.messages.create({
    model: LLM_MODEL_FAST,
    max_tokens: 200,
    system,
    messages: [{ role: 'user', content: user }],
  })
  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('\n')
    .trim()
  return text.length > 240 ? `${text.slice(0, 237)}…` : text
}

async function loadDay(
  supabase: ReturnType<typeof createAdminClient>,
  storeId: string,
  start: Date,
  end: Date,
): Promise<{ date: string; revenue: number; expensesByCategory: Record<string, number> }> {
  const { data: sales } = await supabase
    .from('sales')
    .select('qty, price_at_sale')
    .eq('store_id', storeId)
    .gte('recorded_at', start.toISOString())
    .lte('recorded_at', end.toISOString())
  const revenue = ((sales ?? []) as Array<{ qty: number; price_at_sale: number }>)
    .reduce((s, r) => s + Number(r.qty) * Number(r.price_at_sale), 0)

  const { data: expenses } = await supabase
    .from('expenses')
    .select('category, amount')
    .eq('store_id', storeId)
    .gte('recorded_at', start.toISOString())
    .lte('recorded_at', end.toISOString())
  const expensesByCategory: Record<string, number> = {}
  for (const e of (expenses ?? []) as Array<{ category: string; amount: number }>) {
    expensesByCategory[e.category] = (expensesByCategory[e.category] ?? 0) + Number(e.amount)
  }

  return {
    date: start.toISOString().slice(0, 10),
    revenue,
    expensesByCategory,
  }
}

async function loadDailyRevenue(
  supabase: ReturnType<typeof createAdminClient>,
  storeId: string,
  start: Date,
  endExclusive: Date,
): Promise<RevenueSample[]> {
  const { data: rows } = await supabase
    .from('sales')
    .select('qty, price_at_sale, recorded_at')
    .eq('store_id', storeId)
    .gte('recorded_at', start.toISOString())
    .lt('recorded_at', endExclusive.toISOString())
  const byDay = new Map<string, number>()
  for (const r of (rows ?? []) as Array<{ qty: number; price_at_sale: number; recorded_at: string }>) {
    const day = r.recorded_at.slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + Number(r.qty) * Number(r.price_at_sale))
  }
  return [...byDay.entries()].map(([date, revenue]) => ({ date, revenue }))
}

async function loadDailyExpenses(
  supabase: ReturnType<typeof createAdminClient>,
  storeId: string,
  start: Date,
  endExclusive: Date,
): Promise<ExpenseSample[]> {
  const { data: rows } = await supabase
    .from('expenses')
    .select('category, amount, recorded_at')
    .eq('store_id', storeId)
    .gte('recorded_at', start.toISOString())
    .lt('recorded_at', endExclusive.toISOString())
  return ((rows ?? []) as Array<{ category: string; amount: number; recorded_at: string }>)
    .map(r => ({ date: r.recorded_at.slice(0, 10), category: r.category, amount: Number(r.amount) }))
}
