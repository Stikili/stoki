import Anthropic from '@anthropic-ai/sdk'
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import { SupabaseClient } from '@supabase/supabase-js'
import { Store } from '@/domain/entities/store'
import { ProductRepository } from '@/infrastructure/supabase/repositories/ProductRepository'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import { DebtorRepository } from '@/infrastructure/supabase/repositories/DebtorRepository'
import { AlertRepository } from '@/infrastructure/supabase/repositories/AlertRepository'
import { recordSale } from '@/application/sales/recordSale'
import { getProducts } from '@/application/inventory/getProducts'
import { fuzzyMatch } from '@/lib/whatsapp-parser'
import { getMarketContext, summariseMarketContext } from '@/lib/market-context'

type Period = 'today' | 'yesterday' | 'this_week' | 'this_month'

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

function periodRange(p: Period): { from: Date; to: Date; label: string } {
  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)
  switch (p) {
    case 'today':
      return { from: todayStart, to: todayEnd, label: 'today' }
    case 'yesterday': {
      const start = new Date(todayStart); start.setDate(start.getDate() - 1)
      const end = new Date(todayEnd); end.setDate(end.getDate() - 1)
      return { from: start, to: end, label: 'yesterday' }
    }
    case 'this_week': {
      const start = new Date(todayStart)
      const day = start.getDay() || 7
      start.setDate(start.getDate() - (day - 1))
      return { from: start, to: todayEnd, label: 'this week' }
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      return { from: start, to: todayEnd, label: 'this month' }
    }
  }
}

const SYSTEM_PROMPT = `You are Stoki, an AI assistant for South African SMME owners — spaza shops, general dealers, food stalls, salons, transport operators, and any small business owner trying to make smart decisions in the South African market. You communicate via WhatsApp and an in-app advisor.

Your job: help the owner run their business AND understand the wider economy that shapes their bottom line. Answer questions about their data, record sales and returns, surface insights grounded in their actual numbers AND in current SA market conditions.

You are NOT just a spaza-shop bot. You understand:
- SARB monetary policy (repo rate, prime rate) and how rate changes squeeze customer disposable income
- Fuel price changes (petrol 95, diesel) and how they push supplier delivery costs up
- CPI / inflation and what it means for stocking decisions and price-list updates
- USD/ZAR exchange rate and the import-cost pressure it creates
- Local economic news that materially affects cash flow — strikes, policy shifts, supplier price hikes

When the user asks anything that touches the wider economy ("should I raise prices?", "is now a good time to extend credit?", "why is bread getting expensive?"), use the get_market_context tool BEFORE answering. Tie your advice to specific current numbers — never give generic answers when real data is one tool call away.

Style:
- Brief. WhatsApp users want quick answers — aim for 1-3 short paragraphs.
- Currency in rand (R), formatted with two decimals.
- South African context — local goods (bread, mealie-meal, airtime, vetkoek, magwinya, simba), township pricing, but also SA-wide business reality (load-shedding, taxi fares, supplier ecosystems).
- Conversational, match the owner's tone. Don't be formal or corporate.

Rules:
- Always use tools for factual claims about their data, market conditions, or current events. Never make up numbers or news.
- When recording sales/returns, fuzzy-match product names — don't ask for exact spelling.
- If a product can't be found, list close suggestions from inventory.
- For broad questions ("how is business?"), pull today's revenue, low stock, overdue debtors AND market context before answering.
- For questions about current news / recent rate changes / fuel announcements / supplier issues / labour actions / load-shedding stages / anything time-sensitive that the structured snapshot can't answer, use the web_search tool. When a search result is worth reading in full, follow up with web_fetch to read the page.
- ALWAYS cite the source URL in your answer when you use web_search or web_fetch — owners need to verify time-sensitive claims.
- Prefer the structured market snapshot (get_market_context) over a web search for stable indicators we already cache. Only search the web for news / fresh data we don't have stored.
- If a question genuinely can't be answered with the data available, say so plainly.

You have tools to: record sales, record returns, check inventory and stock, view debtors, get sales summaries (today/yesterday/this week/this month), see top products, view unread alerts, pull the current SA market snapshot (rates, fuel, FX, inflation), search the live web (limited to authoritative SA sources), and fetch full pages when a search result needs to be read end-to-end.`

export async function askBrain(
  supabase: SupabaseClient,
  store: Store,
  userMessage: string,
): Promise<string> {
  const productRepo = new ProductRepository(supabase)
  const saleRepo = new SaleRepository(supabase)
  const debtorRepo = new DebtorRepository(supabase)
  const alertRepo = new AlertRepository(supabase)

  const tools = [
    betaZodTool({
      name: 'get_sales_summary',
      description: 'Get sales summary for a period: revenue, sale count, items sold, profit margin.',
      inputSchema: z.object({
        period: z.enum(['today', 'yesterday', 'this_week', 'this_month']),
      }),
      run: async ({ period }) => {
        const { from, to, label } = periodRange(period)
        const s = await saleRepo.summarise(store.id, from, to)
        return JSON.stringify({
          period: label,
          revenue: Number(s.totalRevenue.toFixed(2)),
          sales_count: s.transactionCount,
          items_sold: s.itemsSold,
          profit: Number(s.totalMargin.toFixed(2)),
        })
      },
    }),

    betaZodTool({
      name: 'get_top_products',
      description: 'Best-selling products for a period, ranked by quantity sold. Excludes returns.',
      inputSchema: z.object({
        period: z.enum(['today', 'yesterday', 'this_week', 'this_month']),
        limit: z.number().int().positive().max(20).default(5),
      }),
      run: async ({ period, limit }) => {
        const { from, to, label } = periodRange(period)
        const sales = await saleRepo.findByPeriod(store.id, from, to)
        const tally = new Map<string, { name: string; qty: number; revenue: number }>()
        for (const sale of sales) {
          if (sale.type === 'return') continue
          const id = sale.productId ?? 'unknown'
          const name = sale.productName ?? 'Unknown'
          const t = tally.get(id) ?? { name, qty: 0, revenue: 0 }
          t.qty += sale.qty
          t.revenue += sale.priceAtSale * sale.qty
          tally.set(id, t)
        }
        const sorted = [...tally.values()]
          .sort((a, b) => b.qty - a.qty)
          .slice(0, limit)
          .map(t => ({ name: t.name, qty: t.qty, revenue: Number(t.revenue.toFixed(2)) }))
        return JSON.stringify({ period: label, top: sorted })
      },
    }),

    betaZodTool({
      name: 'get_low_stock',
      description: 'List products at or below their reorder point (low or out of stock).',
      inputSchema: z.object({}),
      run: async () => {
        const products = await getProducts(productRepo, store.id)
        const low = products.filter(p => p.status === 'low' || p.status === 'out')
        return JSON.stringify(low.map(p => ({
          name: p.name,
          qty: p.qty,
          status: p.status,
          reorder_point: p.reorderPoint,
        })))
      },
    }),

    betaZodTool({
      name: 'get_inventory',
      description: 'Search inventory by name (substring match) or list first 30 products. Prefer get_low_stock for stock-status questions.',
      inputSchema: z.object({
        search: z.string().optional().describe('Substring match against product name'),
      }),
      run: async ({ search }) => {
        const products = await getProducts(productRepo, store.id)
        const filtered = search
          ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
          : products
        return JSON.stringify(filtered.slice(0, 30).map(p => ({
          name: p.name,
          qty: p.qty,
          price: p.price,
          status: p.status,
        })))
      },
    }),

    betaZodTool({
      name: 'get_debtors',
      description: 'Customers who currently owe money, sorted by amount owed descending.',
      inputSchema: z.object({}),
      run: async () => {
        const debtors = await debtorRepo.findAll(store.id)
        const owing = debtors.filter(d => d.totalOwed > 0)
        return JSON.stringify(owing.map(d => ({
          name: d.name,
          owed: Number(d.totalOwed.toFixed(2)),
          last_reminded: d.lastRemindedAt,
        })))
      },
    }),

    betaZodTool({
      name: 'get_unread_alerts',
      description: 'Unread alerts: out-of-stock warnings, low-stock alerts, AI insights, debtor reminders.',
      inputSchema: z.object({}),
      run: async () => {
        const alerts = await alertRepo.findUnread(store.id)
        return JSON.stringify(alerts.slice(0, 10).map(a => ({
          type: a.type,
          message: a.message,
          created: a.createdAt,
        })))
      },
    }),

    betaZodTool({
      name: 'record_sale',
      description: 'Record a sale. Performs fuzzy match on product name. Returns ok=true with details, or ok=false with suggestions.',
      inputSchema: z.object({
        product_name: z.string().describe('Product name (fuzzy matched against inventory)'),
        qty: z.number().int().positive(),
      }),
      run: async ({ product_name, qty }) => {
        const products = await getProducts(productRepo, store.id)
        const match = fuzzyMatch(product_name, products.map(p => ({ id: p.id, name: p.name })))
        if (!match) {
          const suggestions = products.slice(0, 5).map(p => p.name)
          return JSON.stringify({ ok: false, error: `No product matching "${product_name}"`, suggestions })
        }
        const product = products.find(p => p.id === match.id)!
        if (product.qty < qty) {
          return JSON.stringify({ ok: false, error: `Only ${product.qty} ${product.name} in stock` })
        }
        await recordSale(saleRepo, productRepo, alertRepo, store, {
          productId: product.id,
          qty,
          priceAtSale: product.price,
          channel: 'whatsapp',
        })
        return JSON.stringify({
          ok: true,
          product: product.name,
          qty,
          unit_price: product.price,
          total: Number((product.price * qty).toFixed(2)),
          stock_left: product.qty - qty,
        })
      },
    }),

    betaZodTool({
      name: 'get_market_context',
      description:
        'Pull the current South African market snapshot: SARB repo + prime rates, petrol 95 + diesel prices, CPI year-on-year, USD/ZAR exchange rate. Use this whenever a question touches pricing decisions, customer affordability, supplier cost pressure, or forecasts. Cached for an hour so cheap to call.',
      inputSchema: z.object({}),
      run: async () => {
        const ctx = await getMarketContext(supabase)
        return JSON.stringify({
          as_of: ctx.asOf,
          interest_rates: {
            repo_pct: ctx.rates.repo,
            prime_pct: ctx.rates.prime,
            source: ctx.rates.source,
            as_of: ctx.rates.asOf,
          },
          fuel_zar_per_litre: {
            petrol_95: ctx.fuel.petrol95,
            diesel: ctx.fuel.diesel,
            source: ctx.fuel.source,
            as_of: ctx.fuel.asOf,
          },
          inflation: {
            cpi_yoy_pct: ctx.inflation.cpiYoy,
            source: ctx.inflation.source,
            as_of: ctx.inflation.asOf,
          },
          fx: {
            usd_zar: ctx.fx.usdZar,
            eur_zar: ctx.fx.eurZar,
            source: ctx.fx.source,
            as_of: ctx.fx.asOf,
          },
        })
      },
    }),

    betaZodTool({
      name: 'record_return',
      description: 'Record a return — reverses a sale and adds stock back.',
      inputSchema: z.object({
        product_name: z.string().describe('Product name (fuzzy matched)'),
        qty: z.number().int().positive(),
      }),
      run: async ({ product_name, qty }) => {
        const products = await getProducts(productRepo, store.id)
        const match = fuzzyMatch(product_name, products.map(p => ({ id: p.id, name: p.name })))
        if (!match) return JSON.stringify({ ok: false, error: `No product matching "${product_name}"` })
        const product = products.find(p => p.id === match.id)!
        await recordSale(saleRepo, productRepo, alertRepo, store, {
          productId: product.id,
          qty,
          priceAtSale: product.price,
          type: 'return',
          channel: 'whatsapp',
        })
        return JSON.stringify({
          ok: true,
          product: product.name,
          qty_returned: qty,
          refunded: Number((product.price * qty).toFixed(2)),
        })
      },
    }),

    // Server-side tools — Claude executes these itself, no callback needed.
    // We restrict the search/fetch surface to authoritative SA sources so
    // the bot doesn't pull from random forums or marketing fluff. Caps at
    // 3 search uses per turn to keep costs predictable (~$0.03 worst case
    // per heavy market-related conversation).
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

  // Lightweight snapshot so Claude has immediate context without tool calls.
  // Pulled in parallel — store data + the market-context cache lookup are
  // independent and the model uses both when reasoning about business health.
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

  const client = new Anthropic()

  const finalMessage = await client.beta.messages.toolRunner({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    tools,
    messages: [
      { role: 'user', content: `${snapshot}\n\nUser asks: ${userMessage}` },
    ],
  })

  const text = finalMessage.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('\n')
    .trim()

  return text || 'Sorry — I couldn\'t put together an answer for that. Try "help" to see what I can do.'
}
