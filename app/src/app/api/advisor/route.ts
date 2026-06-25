import { NextRequest, NextResponse } from 'next/server'
// Default export aliased — keeps the rest of this file provider-agnostic.
// Swap the package + this single import line if/when we change LLM vendors.
import LLMClient from '@anthropic-ai/sdk'
import { createClient } from '@/infrastructure/supabase/server'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import { getCachedProducts, getCachedDebtors } from '@/lib/cached-queries'
import { LLM_API_KEY, LLM_MODEL, LLM_MODEL_FAST } from '@/lib/llm-config'
import { checkAdvisorBudget, checkGlobalAdvisorBudget, recordAdvisorUse } from '@/lib/ai-cost-meter'
import { effectivePlan } from '@/lib/effective-plan'
import { rateLimitByIp } from '@/lib/rate-limit'
import { buildAllTools } from '@/lib/advisor/tools'
import { loadRecentMessages, appendExchange } from '@/lib/advisor/conversations'
import { createAdminClient } from '@/infrastructure/supabase/admin'

/**
 * Stoki insight — in-app AI advisor.
 *
 * Tool-using agent built on the shared registry in lib/advisor/tools.ts so
 * it has symmetric capability with the WhatsApp brain: 15 tools covering
 * read (sales summary, top products, low stock, inventory, debtors, alerts,
 * market context, business insight, demand forecast) + write (sale, return,
 * restock, expense, wastage).
 *
 * Supports image inputs — the client can pass `images` (array of data-URLs
 * or signed Supabase URLs) on the latest user message and the LLM sees them
 * natively via Anthropic's vision API. Use case: snap a supplier invoice
 * and the model extracts line items then calls record_restock.
 *
 * Conversation memory: previous turns for this (user, store) are loaded
 * from `advisor_conversations` and prefixed before the new request. Memory
 * is channel-scoped — in-app and WhatsApp don't bleed into each other.
 *
 * Routing: starts on the cheap model unless the question is long or the
 * first turn pulls in feature-heavy reasoning. Tool-use itself triggers
 * recursion via the SDK's tool-runner, so the model picks up complexity
 * dynamically.
 */
export async function POST(req: NextRequest) {
  const apiKey = LLM_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Advisor not configured' }, { status: 503 })

  // IP-based burst throttle. 30 req/min/IP — accommodates a chatty human
  // sending several follow-ups in quick succession, blocks scripted abuse.
  // Tunable via env if you see legitimate users tripping it.
  const ipBlock = await rateLimitByIp(req, 'advisor', Number(process.env.ADVISOR_RATE_LIMIT_PER_MIN ?? 30))
  if (ipBlock) return ipBlock

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Global daily ceiling — protects the Anthropic bill from the
  // "10 000 users hit their free quota the same day" scenario. Returns
  // a polite maintenance message; default 50 000 total calls/day.
  const globalBudget = await checkGlobalAdvisorBudget(supabase)
  if (!globalBudget.ok) {
    return NextResponse.json({ message: globalBudget.message, throttled: true })
  }

  const body = await req.json()
  const { messages, storeId, images } = body as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    storeId?: string
    /** Optional. Image inputs for the latest user turn. Each entry is either
     *  a data URL (data:image/jpeg;base64,...) or a remote URL the model
     *  can fetch. Used for supplier-invoice / receipt photo ingestion. */
    images?: string[]
  }

  const storeRepo = new StoreRepository(supabase)
  const allStores = await storeRepo.findAllByOwner(user.id)
  if (!allStores.length) return NextResponse.json({ error: 'No store' }, { status: 404 })
  const store = allStores.find(s => s.id === storeId) ?? allStores[0]

  const plan = effectivePlan(store)
  const budget = await checkAdvisorBudget(supabase, user.id, plan)
  if (!budget.ok) {
    return NextResponse.json({ message: budget.message, throttled: true })
  }

  // Pre-call snapshot — same shape as the WhatsApp brain so the LLM has
  // free immediate context without burning a tool call for "what's my
  // store at right now".
  const saleRepo = new SaleRepository(supabase)
  const now = new Date()
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999)

  const [productsWithStatus, debtors, todaySales] = await Promise.all([
    getCachedProducts(store.id),
    getCachedDebtors(store.id),
    saleRepo.summarise(store.id, dayStart, dayEnd),
  ])
  const lowStock = productsWithStatus.filter(p => p.status === 'low' || p.status === 'out')
  const totalOwed = debtors.reduce((sum, d) => sum + d.totalOwed, 0)

  const categoryLabels: Record<string, string> = {
    spaza: 'spaza shop',
    general_dealer: 'general dealer',
    food_stall: 'food stall',
    other: 'shop',
  }
  const storeType = categoryLabels[store.category ?? 'other'] ?? 'shop'
  const locationContext = store.location
    ? `Location: ${store.location}, South Africa.`
    : 'Location: South Africa (area not specified).'

  const systemPrompt = `You are stoki insight, the business advisor built into the stoki app. You're advising the owner of ${store.name}, a ${storeType} in South Africa. ${locationContext}

How to talk:
- Plain, conversational, South African township/SMME tone. No corporate jargon.
- Rands (R) for currency, two decimals.
- Brief: 1-3 short sentences unless the answer genuinely needs more.
- Connect every economic point back to their till. "Repo rate up 25bps" means nothing — "your customers have less to spend this month" means everything.

Tools you have:
- Store data: get_sales_summary, get_top_products, get_low_stock, get_inventory, get_debtors, get_unread_alerts.
- Environment: get_market_context (SARB rate, fuel, CPI, USD/ZAR — cached).
- Insights: get_business_insight with a topic (rand_sensitivity / cultural_events / credit_book / energy_advisor / sassa_risk / category_strategy / peer_benchmarking / supplier_scorecard / basket_analysis / local_price / group_buying / business_valuation / funding_navigator). Some are Pro-only — the tool will tell you when locked.
- Forecasting: forecast_demand to project days-of-cover.
- Actions: record_sale, record_return, record_restock, record_expense, record_wastage. Fuzzy-match product names; never ask for exact spelling.

If the owner sends a photo (supplier invoice / receipt / shelf shot):
- Extract what you can see (line items, quantities, unit prices, totals).
- Confirm with the owner before recording — show them what you understood, then call record_restock / record_expense once they say yes.

Rules:
- Always use a tool for factual claims about their data — never make up numbers.
- For "how is business?" — pull today's revenue, low stock, overdue debtors AND market context, then summarise.
- If a tool returns a paywall pitch, surface it honestly — don't fabricate the answer they'd have got on Pro.

Snapshot (no tool call needed):
- Store: ${store.name} (${storeType})
- Today's revenue: R${todaySales.totalRevenue.toFixed(2)} (${todaySales.transactionCount} sales)
- Low / out of stock: ${lowStock.length}
- Debtors owing: ${debtors.filter(d => d.totalOwed > 0).length} customers, R${totalOwed.toFixed(2)} total
- Effective plan: ${plan}`

  // Load conversation memory for this (user, store, 'in_app'). Channel-
  // scoped so in-app and WhatsApp histories don't mix.
  const admin = createAdminClient()
  const prior = await loadRecentMessages(admin, user.id, store.id, 'in_app')

  // Compose the live messages array. The current turn includes any image
  // attachments inline as Anthropic vision content blocks; prior history
  // is plain text only (we don't persist image bytes).
  const validClientMessages = (messages ?? []).filter(
    m => m.role === 'user' || m.role === 'assistant',
  )
  const currentMessages = [
    ...prior.map(m => ({ role: m.role, content: m.content })),
    ...validClientMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
  ]
  const lastClientMessage = validClientMessages[validClientMessages.length - 1]
  if (lastClientMessage) {
    if (Array.isArray(images) && images.length > 0) {
      // Multi-modal turn — text + images.
      const imageBlocks = images.slice(0, 4).map(src => buildImageBlock(src))
      currentMessages.push({
        role: lastClientMessage.role,
        content: [
          { type: 'text' as const, text: lastClientMessage.content },
          ...imageBlocks,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ] as any,
      })
    } else {
      currentMessages.push({ role: lastClientMessage.role, content: lastClientMessage.content })
    }
  }

  // Cheap-model heuristic. Vision + images always escalates; long messages
  // escalate; otherwise default to the fast model. Tool calls trigger their
  // own recursion via the SDK so the model picks up complexity dynamically.
  const lastUserText = lastClientMessage?.content ?? ''
  const escalate = (images?.length ?? 0) > 0 || lastUserText.length >= 300
  const model = escalate ? LLM_MODEL : LLM_MODEL_FAST

  const tools = buildAllTools({
    supabase, store, userId: user.id, channel: 'in_app',
  })

  const ai = new LLMClient({ apiKey })

  let finalText = ''
  try {
    const finalMessage = await ai.beta.messages.toolRunner({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      tools,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: currentMessages as any,
    })
    finalText = finalMessage.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('\n')
      .trim()
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Advisor failed',
    }, { status: 500 })
  }

  if (!finalText) finalText = "I couldn't put together an answer for that. Try rephrasing?"

  // Increment per-user daily counter on success (fire-and-forget).
  void recordAdvisorUse(supabase, user.id)

  // Persist this exchange for future conversation memory.
  if (lastClientMessage) {
    void appendExchange(admin, user.id, store.id, 'in_app', lastClientMessage.content, finalText)
  }

  return NextResponse.json({ message: finalText })
}

/**
 * Build an Anthropic image content block from either a data URL or a
 * remote URL. We accept both shapes so the client can post either a
 * `data:image/jpeg;base64,...` string (immediate, no network) or a signed
 * Supabase Storage URL (when image gets too big to inline).
 */
function buildImageBlock(src: string) {
  if (src.startsWith('data:')) {
    const match = src.match(/^data:(image\/[a-z]+);base64,(.+)$/)
    if (!match) throw new Error('Invalid data URL')
    return {
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
        data: match[2],
      },
    }
  }
  return {
    type: 'image' as const,
    source: { type: 'url' as const, url: src },
  }
}
