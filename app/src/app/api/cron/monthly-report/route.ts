import { NextResponse } from 'next/server'
import LLMClient from '@anthropic-ai/sdk'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { authoriseCron, configureVapid, fetchAllSubscriptions, sendAndPersist } from '@/lib/push-helpers'
import { LLM_API_KEY, LLM_MODEL_FAST } from '@/lib/llm-config'
import { buildSummaryPrompt, computeMonthlyStats } from '@/lib/monthly-report'
import { isValidAiTone, DEFAULT_AI_TONE } from '@/domain/entities/ai-tone'
import { sendWhatsAppTemplate } from '@/lib/whatsapp'
import { log } from '@/lib/log'

/**
 * Monthly-report cron. Fires 05:00 UTC (07:00 SAST) on the 1st of every
 * month. For every store with activity in the previous month, generates a
 * plain-English recap in the owner's chosen AI tone and delivers it via
 * three channels (in order of reliability):
 *
 *  1. In-app alert    — always persisted; visible in /alerts inbox forever.
 *  2. Web push        — for users who opted in; uses shared push helpers.
 *  3. WhatsApp template — optional. Only fires when
 *     META_MONTHLY_REPORT_TEMPLATE is set AND the store has a whatsapp
 *     number. The template must be pre-approved in Meta Business Manager
 *     with one body param ({{1}} = the summary text) or the send silently
 *     fails and the other two channels still land.
 *
 * Dormant stores (zero sales AND zero expenses in the month) are skipped
 * so we don't spam an inactive account with "you did R0 this month".
 */

const CONCURRENCY = 4
const WHATSAPP_TEMPLATE_LANG = process.env.META_MONTHLY_REPORT_TEMPLATE_LANG ?? 'en'

export async function POST(req: Request) {
  if (!authoriseCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!LLM_API_KEY) return NextResponse.json({ error: 'LLM not configured', delivered: 0 })

  configureVapid()
  const supabase = createAdminClient()
  const ai = new LLMClient({ apiKey: LLM_API_KEY })

  const { data: storeRows } = await supabase
    .from('stores')
    .select('id, name, whatsapp_number, ai_tone')
    .is('deleted_at', null)

  const stores = (storeRows ?? []) as Array<{
    id: string; name: string; whatsapp_number: string | null; ai_tone: string | null
  }>
  if (stores.length === 0) {
    return NextResponse.json({ evaluated: 0, delivered: 0, skipped: 0 })
  }

  const subs = await fetchAllSubscriptions(supabase)

  // Bounded concurrency — 4 stores in flight at a time. Each store does
  // one LLM call (~1-2s), so 4x parallelism keeps the whole cron under a
  // minute even at ~1000 stores.
  let delivered = 0
  let skipped = 0
  let failed = 0
  for (let i = 0; i < stores.length; i += CONCURRENCY) {
    const batch = stores.slice(i, i + CONCURRENCY)
    const results = await Promise.all(batch.map(async store => {
      try {
        return await deliverForStore(supabase, ai, subs, store)
      } catch (e) {
        log.error('cron.monthly_report.store_failed', { storeId: store.id, error: e })
        return { status: 'failed' as const }
      }
    }))
    for (const r of results) {
      if (r.status === 'delivered') delivered++
      else if (r.status === 'skipped') skipped++
      else failed++
    }
  }

  log.info('cron.monthly_report.done', {
    evaluated: stores.length, delivered, skipped, failed,
  })
  return NextResponse.json({ evaluated: stores.length, delivered, skipped, failed })
}

export async function GET(req: Request) { return POST(req) }

type DeliveryResult = { status: 'delivered' | 'skipped' | 'failed' }

async function deliverForStore(
  supabase: ReturnType<typeof createAdminClient>,
  ai: LLMClient,
  subs: Awaited<ReturnType<typeof fetchAllSubscriptions>>,
  store: { id: string; name: string; whatsapp_number: string | null; ai_tone: string | null },
): Promise<DeliveryResult> {
  const stats = await computeMonthlyStats(supabase, store.id, new Date())
  if (!stats.hasActivity) return { status: 'skipped' }

  const tone = isValidAiTone(store.ai_tone) ? store.ai_tone : DEFAULT_AI_TONE
  const { system, user } = buildSummaryPrompt(stats, tone)

  const response = await ai.messages.create({
    model: LLM_MODEL_FAST,
    max_tokens: 400,
    system,
    messages: [{ role: 'user', content: user }],
  })

  const summary = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('\n')
    .trim()

  if (!summary) return { status: 'failed' }

  const title = `${stats.storeName} — ${stats.prevMonth.name} recap`
  const body = summary.length > 240 ? `${summary.slice(0, 237)}…` : summary

  await sendAndPersist(
    supabase, store.id, subs,
    { title, body, url: '/alerts' },
    'ai_insight',
    `[MONTHLY] ${stats.prevMonth.name} — ${summary}`,
  )

  // Optional WhatsApp delivery. Requires a pre-approved template with a
  // single body param — Meta rejects free-form text sent outside the 24h
  // service window, so this MUST be a template.
  const template = process.env.META_MONTHLY_REPORT_TEMPLATE
  if (template && store.whatsapp_number) {
    try {
      await sendWhatsAppTemplate(store.whatsapp_number, template, WHATSAPP_TEMPLATE_LANG, [summary])
    } catch (e) {
      log.warn('cron.monthly_report.whatsapp_failed', { storeId: store.id, error: e })
    }
  }

  return { status: 'delivered' }
}
