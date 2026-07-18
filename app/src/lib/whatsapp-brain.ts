// Default export aliased — keeps the rest of this file provider-agnostic.
// Swap the package + this single import line if/when we change LLM vendors.
import LLMClient from '@anthropic-ai/sdk'
import { LLM_MODEL } from '@/lib/llm-config'
import { SupabaseClient } from '@supabase/supabase-js'
import { Store } from '@/domain/entities/store'
import { ProductRepository } from '@/infrastructure/supabase/repositories/ProductRepository'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import { DebtorRepository } from '@/infrastructure/supabase/repositories/DebtorRepository'
import { getProducts } from '@/application/inventory/getProducts'
import { getMarketContext, summariseMarketContext } from '@/lib/market-context'
import { buildAllTools } from '@/lib/advisor/tools'
import { loadRecentMessages, appendExchange } from '@/lib/advisor/conversations'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { SCOPE_LOCK_BLOCK } from '@/lib/ai-scope-prompt'

/**
 * Authoritative SA sources the bot is allowed to search + fetch from.
 * Curated to keep the model anchored on government data, the central bank,
 * and respected business journalism — no forums, no marketing-blog SEO
 * spam. Add new domains here when a use case justifies it; removing one
 * silently strips it from search results without breaking anything else.
 */
const WEB_SOURCE_ALLOWLIST = [
  // Government / official statistics
  'resbank.co.za',
  'statssa.gov.za',
  'energy.gov.za',
  'treasury.gov.za',
  'sars.gov.za',
  'gov.za',
  // Industry / sector
  'aa.co.za',
  'eskom.co.za',
  'agbiz.co.za',
  // SA business journalism (paywall-light, factual)
  'businesstech.co.za',
  'dailymaverick.co.za',
  'moneyweb.co.za',
  'fin24.com',
  'news24.com',
  'bizcommunity.com',
  'mybroadband.co.za',
  'ewn.co.za',
  'iol.co.za',
  // International coverage of SA macro
  'reuters.com',
  'bloomberg.com',
]

const SYSTEM_PROMPT = `You are Stoki — a friendly, practical assistant for South African small-business owners. Most users are spaza shops, informal traders, food stalls, salons, transport operators. They aren't accountants; they're trying to keep their till healthy through tomorrow.

Your job: help them run their shop, explain HOW to use the Stoki app when asked, AND make sense of what's happening in the economy that affects their takings.

${SCOPE_LOCK_BLOCK}


How to talk:
- Like a knowledgeable friend, not a finance textbook. Skip corporate jargon.
- Brief — 1 to 3 short sentences for most answers. Never lecture.
- Plain English. Say "rates" not "monetary policy", "people have less to spend" not "disposable income tighter", "rand is weaker" not "FX depreciation".
- Currency in rand (R), formatted with two decimals.
- Comfortable with local goods (bread, mealie-meal, airtime, vetkoek, magwinya, simba) and SA business reality.
- Connect every economic point back to their till. "Repo rate up 25 points" means nothing — "your customers have less money this month" means everything.

When to use which tool:
- For their own data ("today's profit", "who owes me", "what to reorder", "best seller") — pull from their store with get_*. NEVER search the web for store data.
- For business actions ("record sale", "log expense", "I restocked 2 cases of Coke", "throw away expired bread") — use the record_* tools. Fuzzy-match product names; if no match, suggest alternatives.
- For forecast questions ("when will I run out of bread?") — use forecast_demand.
- For deep insights ("how do I compare to nearby shops?", "what's my shop worth?", "where can I get funding?") — use get_business_insight with the right topic.
- For stable economic indicators (current SARB rate, current fuel price, latest CPI, USD/ZAR) — use get_market_context. Cached so it's fast and free.
- For news / what's happening / fresh announcements ("how is the economy?", "is fuel increasing?", "what did SARB say today?", "any supplier news?") — use web_search. Allowed sources are SA-authoritative. Cite the URL.
- For a search hit worth reading in full — follow up with web_fetch.

How-to questions about the Stoki app itself (NO tools needed, just explain):
- "How do I record a sale?" — Open the app, tap the green + button in the centre of the bottom bar, pick the products, confirm.
- "How do I do cash up?" — Dashboard → Manage → Daily section → "Cash up" tile. Counts cash, card, EFT at end of day.
- "Where do I find my reports / VAT?" — Dashboard → Manage → Books section → "Reports" or "VAT" tile. If Books is hidden, tap "Show" next to the Books label.
- "How do I add a debtor / credit customer?" — Bottom bar → Credit → "Add customer" button.
- "How do I add stock / a product?" — Bottom bar → Inventory → "Add product" button. Or ask me here: "I restocked 5 cases of Coke".
- "How do I change prices?" — Dashboard → Manage → Daily → "Prices" tile. Tap any product to edit.
- "How do I send an invoice?" — Dashboard → Manage → Books → "Invoices" tile → "New invoice". Needs a B2B customer first.
- "How do I switch dashboard view (Simple / Full)?" — Settings → Account & preferences → Dashboard density.
- "How do I add another store?" — Tap the store name at the top of the dashboard → "Add a store".
- "How do I invite a teammate?" — Settings → Team → Invite member (owner only).
- If asked something not on this list, give a concise 1-sentence directional answer like "Try the Settings page" or "Use the green + button in the centre of the bottom bar".

Rules:
- Always use tools for factual claims about the user's data, market, or news. Never make up numbers, dates, or news.
- When recording sales/returns/restocks/wastage, fuzzy-match product names — don't ask for exact spelling.
- If a product can't be found, list close suggestions from inventory.
- For "how is business?" — pull today's revenue, low stock, overdue debtors AND market context before answering.
- For "how is the economy?" — pull market context AND search the web for recent commentary on growth + consumer spending. Sum it up in 2-3 plain sentences plus one line on what it means for the user's shop.
- For "is fuel increasing?" — search aa.co.za or energy.gov.za for the next price change. Give the date, the rand-per-litre move, and what it means for supplier delivery costs.
- ALWAYS cite the source URL when you used web_search or web_fetch.
- If a question genuinely can't be answered with the data available, say so plainly.`

/**
 * First-contact / help-menu fast-path. Bypasses the LLM entirely for the
 * most common opening words — the user gets an instant, deterministic menu
 * of what they can ask. Saves tokens and gives a snappy first impression.
 *
 * Anything else (including "how do I record a sale?") falls through to the
 * model, which the system prompt instructs to answer in 1-2 sentences using
 * the app's actual nav.
 */
const HELP_TRIGGERS = new Set([
  'help', 'menu', '?', 'start', 'hi', 'hey', 'hello', 'hola', 'sawubona', 'molo',
  "what can you do", 'what can you do?', 'what can i ask',
])

/**
 * True if the given user message will be answered by the deterministic
 * HELP_MENU fast-path (no LLM invocation). Exported so the WhatsApp
 * webhook can skip the daily-budget reservation for these calls —
 * previously, sending "sawubona" 10 times burned a free-tier user's
 * entire quota with zero token spend (BUG-001 from 2026-07-18 review).
 *
 * Mirrors the normalisation done inside askBrain so both call sites
 * classify the same string the same way.
 */
export function isHelpMenuMessage(userMessage: string): boolean {
  const normalised = userMessage.trim().toLowerCase().replace(/[!.…]+$/, '')
  return HELP_TRIGGERS.has(normalised)
}

const HELP_MENU_TEXT = `Hi! I'm Stoki — your shop assistant 🟢

Ask me anything in plain English. Try things like:

📊 *"How is business today?"*
💰 *"What's my profit this month?"*
📦 *"What should I reorder?"*
🧾 *"Who owes me money?"*
💵 *"Sold 5 bread"* — I'll record the sale
📝 *"Paid 200 rand for airtime"* — I'll log the expense
📈 *"How is the economy?"*
❓ *"How do I do cash up?"* — I'll show you where

Anything you can think of about your shop, just ask. Send a voice note if it's easier than typing.

Stuck on something I can't help with? Email a human at *support@stokiapp.com*.`

export async function askBrain(
  supabase: SupabaseClient,
  store: Store,
  userMessage: string,
  userId?: string,
): Promise<string> {
  // Help fast-path. Match common first-contact words exactly (after
  // lowercase + trim) so a casual "hi" or "help" returns instantly with a
  // menu of example queries — no LLM call, no token cost, no latency.
  // Free-form how-to questions like "how do I record a sale?" fall through
  // to the model, which the system prompt teaches to answer with nav.
  const normalised = userMessage.trim().toLowerCase().replace(/[!.…]+$/, '')
  if (HELP_TRIGGERS.has(normalised)) {
    // Still persist the exchange so the convo memory shows the user said hi
    // — keeps future "what was that menu again?" replies coherent.
    if (userId) {
      const admin = createAdminClient()
      void appendExchange(admin, userId, store.id, 'whatsapp', userMessage, HELP_MENU_TEXT)
    }
    return HELP_MENU_TEXT
  }

  // Use shared registry so the WhatsApp brain has symmetric tooling with
  // the in-app advisor — sales/returns + restock/expense/wastage writes,
  // 13 F-A advisor insights, demand forecasting. Plus the two external
  // web tools that are WhatsApp-specific (in-app gets them in a follow-up).
  const tools = [
    ...buildAllTools({ supabase, store, userId, channel: 'whatsapp' }),
    {
      type: 'web_search_20260209' as const,
      name: 'web_search' as const,
      max_uses: 3,
      allowed_domains: WEB_SOURCE_ALLOWLIST,
    },
    {
      type: 'web_fetch_20260309' as const,
      name: 'web_fetch' as const,
      max_uses: 3,
      allowed_domains: WEB_SOURCE_ALLOWLIST,
    },
  ]

  // Lightweight snapshot so the model has immediate context without tool
  // calls. Pulled in parallel — store data + the market-context cache lookup
  // are independent and the model uses both when reasoning about business health.
  const productRepo = new ProductRepository(supabase)
  const saleRepo = new SaleRepository(supabase)
  const debtorRepo = new DebtorRepository(supabase)
  const [products, debtors, today, market] = await Promise.all([
    getProducts(productRepo, store.id),
    debtorRepo.findAll(store.id),
    (async () => {
      const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(); dayEnd.setHours(23, 59, 59, 999)
      return saleRepo.summarise(store.id, dayStart, dayEnd)
    })(),
    getMarketContext(supabase).catch(() => null),
  ])

  const lowCount = products.filter(p => p.status === 'low' || p.status === 'out').length
  const owingDebtors = debtors.filter(d => d.totalOwed > 0)
  const totalOwed = owingDebtors.reduce((s, d) => s + d.totalOwed, 0)

  const snapshot = [
    `[Store: ${store.name}]`,
    `Today so far: R${today.totalRevenue.toFixed(2)} (${today.transactionCount} sales)`,
    `Low/out of stock: ${lowCount} items`,
    `Debtors owing: ${owingDebtors.length} customers (R${totalOwed.toFixed(2)} total)`,
    market ? summariseMarketContext(market) : '',
  ].filter(Boolean).join('\n')

  // Conversation memory: load last ~8 turns so the bot can stitch context
  // across sessions ("did you ever raise that price?"). Admin client lives
  // outside the user-scoped RLS — analytics-style read.
  const admin = createAdminClient()
  const prior = userId
    ? await loadRecentMessages(admin, userId, store.id, 'whatsapp')
    : []

  const client = new LLMClient()

  const finalMessage = await client.beta.messages.toolRunner({
    model: LLM_MODEL,
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    tools,
    messages: [
      ...prior.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: `${snapshot}\n\nUser asks: ${userMessage}` },
    ],
  })

  const text = finalMessage.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('\n')
    .trim()

  const response = text || 'Sorry — I couldn\'t put together an answer for that. Try "help" to see what I can do.'

  // Persist this exchange (only the bare user/assistant text, no snapshot,
  // so future turns load lean). Fire-and-forget; never block.
  if (userId) void appendExchange(admin, userId, store.id, 'whatsapp', userMessage, response)

  return response
}
