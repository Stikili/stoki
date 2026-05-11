import { z } from 'zod'
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod'

import { getProducts } from '@/application/inventory/getProducts'
import { recordSale as runRecordSale } from '@/application/sales/recordSale'
import { fuzzyMatch } from '@/lib/whatsapp-parser'
import { getMarketContext } from '@/lib/market-context'

import { ProductRepository } from '@/infrastructure/supabase/repositories/ProductRepository'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import { DebtorRepository } from '@/infrastructure/supabase/repositories/DebtorRepository'
import { AlertRepository } from '@/infrastructure/supabase/repositories/AlertRepository'
import { ExpenseRepository } from '@/infrastructure/supabase/repositories/ExpenseRepository'
import { RestockRepository } from '@/infrastructure/supabase/repositories/RestockRepository'
import { WastageRepository } from '@/infrastructure/supabase/repositories/WastageRepository'

import { type GateId } from '@/lib/plan-gates'
import { periodRange, type Period } from './helpers'
import { getInsightBlock, INSIGHT_TOPICS, type InsightTopic } from '@/application/advisor/features'
import type { ToolContext } from './types'

/**
 * Shared tool registry — used by both the WhatsApp brain and the in-app
 * advisor. Each tool is built per-request (closes over ctx) so the
 * Anthropic SDK gets a tool runner that can mutate the right store.
 *
 * Behaviour rules:
 *   - Read tools never throw — return structured JSON describing what
 *     they found (or didn't), let the LLM frame the response.
 *   - Write tools also return JSON: { ok: bool, ...detail, error? }.
 *     They mutate via existing repositories so plan gates / RLS / domain
 *     rules already in place still apply.
 *   - Plan-gated tools self-filter out of the returned list when the
 *     store's effective plan doesn't qualify — the LLM never sees them.
 */

const PERIOD_ENUM = z.enum(['today', 'yesterday', 'this_week', 'this_month'])

export function buildAllTools(ctx: ToolContext) {
  const { supabase, store, channel } = ctx
  const productRepo = new ProductRepository(supabase)
  const saleRepo    = new SaleRepository(supabase)
  const debtorRepo  = new DebtorRepository(supabase)
  const alertRepo   = new AlertRepository(supabase)
  const expenseRepo = new ExpenseRepository(supabase)
  const restockRepo = new RestockRepository(supabase)
  const wastageRepo = new WastageRepository(supabase)

  // Tools have heterogeneous input schemas; the Anthropic SDK accepts the
  // mixed array fine at runtime, but TypeScript can't unify the generics
  // across `betaZodTool` calls. `any` here is the pragmatic escape — every
  // call site is locally well-typed inside the closure.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: any[] = []

  // ── Read: store data ────────────────────────────────────────────────────
  tools.push(betaZodTool({
    name: 'get_sales_summary',
    description: 'Revenue, sale count, items sold, profit margin for a period.',
    inputSchema: z.object({ period: PERIOD_ENUM }),
    run: async ({ period }) => {
      const { from, to, label } = periodRange(period as Period)
      const s = await saleRepo.summarise(store.id, from, to)
      return JSON.stringify({
        period: label,
        revenue: round2(s.totalRevenue),
        sales_count: s.transactionCount,
        items_sold: s.itemsSold,
        profit: round2(s.totalMargin),
      })
    },
  }))

  tools.push(betaZodTool({
    name: 'get_top_products',
    description: 'Best-selling products for a period, ranked by quantity. Excludes returns.',
    inputSchema: z.object({
      period: PERIOD_ENUM,
      limit: z.number().int().positive().max(20).default(5),
    }),
    run: async ({ period, limit }) => {
      const { from, to, label } = periodRange(period as Period)
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
        .map(t => ({ name: t.name, qty: t.qty, revenue: round2(t.revenue) }))
      return JSON.stringify({ period: label, top: sorted })
    },
  }))

  tools.push(betaZodTool({
    name: 'get_low_stock',
    description: 'Products at or below their reorder point.',
    inputSchema: z.object({}),
    run: async () => {
      const products = await getProducts(productRepo, store.id)
      const low = products.filter(p => p.status === 'low' || p.status === 'out')
      return JSON.stringify(low.map(p => ({
        name: p.name, qty: p.qty, status: p.status, reorder_point: p.reorderPoint,
      })))
    },
  }))

  tools.push(betaZodTool({
    name: 'get_inventory',
    description: 'Search inventory by name substring or list first 30 products.',
    inputSchema: z.object({
      search: z.string().optional().describe('Substring match on product name'),
    }),
    run: async ({ search }) => {
      const products = await getProducts(productRepo, store.id)
      const filtered = search
        ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
        : products
      return JSON.stringify(filtered.slice(0, 30).map(p => ({
        name: p.name, qty: p.qty, price: p.price, cost: p.cost, status: p.status,
      })))
    },
  }))

  tools.push(betaZodTool({
    name: 'get_debtors',
    description: 'Customers who currently owe money, sorted by amount.',
    inputSchema: z.object({}),
    run: async () => {
      const debtors = await debtorRepo.findAll(store.id)
      const owing = debtors.filter(d => d.totalOwed > 0)
      return JSON.stringify(owing.map(d => ({
        name: d.name, owed: round2(d.totalOwed), last_reminded: d.lastRemindedAt,
      })))
    },
  }))

  tools.push(betaZodTool({
    name: 'get_unread_alerts',
    description: 'Unread alerts: out-of-stock, low-stock, AI insights, debtor reminders.',
    inputSchema: z.object({}),
    run: async () => {
      const alerts = await alertRepo.findUnread(store.id)
      return JSON.stringify(alerts.slice(0, 10).map(a => ({
        type: a.type, message: a.message, created: a.createdAt,
      })))
    },
  }))

  // ── Read: environment ──────────────────────────────────────────────────
  tools.push(betaZodTool({
    name: 'get_market_context',
    description: 'Current SA market snapshot: SARB repo + prime, petrol/diesel, CPI, USD/ZAR. Use whenever a question touches pricing decisions, customer affordability, or supplier cost pressure. Cached cheaply.',
    inputSchema: z.object({}),
    run: async () => {
      const c = await getMarketContext(supabase)
      return JSON.stringify({
        as_of: c.asOf,
        interest_rates: { repo_pct: c.rates.repo, prime_pct: c.rates.prime, source: c.rates.source, as_of: c.rates.asOf },
        fuel_zar_per_litre: { petrol_95: c.fuel.petrol95, diesel: c.fuel.diesel, source: c.fuel.source, as_of: c.fuel.asOf },
        inflation: { cpi_yoy_pct: c.inflation.cpiYoy, source: c.inflation.source, as_of: c.inflation.asOf },
        fx: { usd_zar: c.fx.usdZar, eur_zar: c.fx.eurZar, source: c.fx.source, as_of: c.fx.asOf },
      })
    },
  }))

  // ── Read: insight (13 F-A blocks behind one tool) ──────────────────────
  tools.push(betaZodTool({
    name: 'get_business_insight',
    description:
      `Pull a topical advisor insight. Topics:
- 'rand_sensitivity'  — USD/ZAR + which SKUs are import-priced
- 'cultural_events'   — upcoming SA public holidays + cultural events stock plan
- 'credit_book'       — exposure %, top debtors, healthy band check
- 'energy_advisor'    — solar / battery / inverter break-even framing
- 'sassa_risk'        — grant-cycle revenue concentration + diversification
- 'category_strategy' — where to beat / not beat formal retail
- 'peer_benchmarking' (Pro) — anonymised percentile rank vs cohort
- 'supplier_scorecard' (Pro) — price CV, on-time, fill, invoice trend
- 'basket_analysis'   (Pro) — what customers buy together
- 'local_price'       (Pro) — your prices vs nearby Stoki shops
- 'group_buying'      (Pro) — pool restock orders with nearby shops
- 'business_valuation'(Pro) — multipliers + formalisation checklist
- 'funding_navigator' (Pro) — SEFA/NYDA/NEF/commercial mapping`,
    inputSchema: z.object({
      topic: z.enum(INSIGHT_TOPICS),
    }),
    run: async ({ topic }) => {
      const block = await getInsightBlock(supabase, store, topic as InsightTopic)
      return block ?? JSON.stringify({ note: `No insight available for ${topic} right now.` })
    },
  }))

  // ── Read: forecasting ─────────────────────────────────────────────────
  tools.push(betaZodTool({
    name: 'forecast_demand',
    description: 'Days-of-cover projection: how many days until each product runs out at current sales velocity (last 30 days). Returns either one product (if `product_name` set) or the 10 most urgent.',
    inputSchema: z.object({
      product_name: z.string().optional().describe('Optional. Substring match on a product name.'),
    }),
    run: async ({ product_name }) => {
      const products = await getProducts(productRepo, store.id)
      // 30-day velocity per product
      const since = new Date(); since.setDate(since.getDate() - 30)
      const sales = await saleRepo.findByPeriod(store.id, since, new Date())
      const velocity = new Map<string, number>()
      for (const s of sales) {
        if (s.type === 'return' || !s.productId) continue
        velocity.set(s.productId, (velocity.get(s.productId) ?? 0) + s.qty)
      }

      const rows = products
        .filter(p => p.qty > 0 || (velocity.get(p.id) ?? 0) > 0)
        .map(p => {
          const daily = (velocity.get(p.id) ?? 0) / 30
          const daysOfCover = daily > 0 ? p.qty / daily : null
          return {
            name: p.name,
            on_hand: p.qty,
            daily_velocity: round2(daily),
            days_of_cover: daysOfCover === null ? null : Math.round(daysOfCover * 10) / 10,
          }
        })

      const filtered = product_name
        ? rows.filter(r => r.name.toLowerCase().includes(product_name.toLowerCase()))
        : rows
            .filter(r => r.days_of_cover !== null)
            .sort((a, b) => (a.days_of_cover ?? 1e9) - (b.days_of_cover ?? 1e9))
            .slice(0, 10)

      return JSON.stringify({
        window_days: 30,
        items: filtered,
        note: product_name
          ? undefined
          : 'Top 10 most-urgent by days-of-cover. Items without recent sales are excluded.',
      })
    },
  }))

  // ── Write: sales + returns ────────────────────────────────────────────
  tools.push(betaZodTool({
    name: 'record_sale',
    description: 'Record a sale. Fuzzy-matches product name; suggests alternatives if no match.',
    inputSchema: z.object({
      product_name: z.string(),
      qty: z.number().int().positive(),
    }),
    run: async ({ product_name, qty }) => {
      const products = await getProducts(productRepo, store.id)
      const match = fuzzyMatch(product_name, products.map(p => ({ id: p.id, name: p.name })))
      if (!match) {
        return JSON.stringify({
          ok: false,
          error: `No product matching "${product_name}"`,
          suggestions: products.slice(0, 5).map(p => p.name),
        })
      }
      const product = products.find(p => p.id === match.id)!
      if (product.qty < qty) {
        return JSON.stringify({ ok: false, error: `Only ${product.qty} ${product.name} in stock` })
      }
      await runRecordSale(saleRepo, productRepo, alertRepo, store, {
        productId: product.id,
        qty,
        priceAtSale: product.price,
        channel: channel === 'whatsapp' ? 'whatsapp' : 'app',
      })
      return JSON.stringify({
        ok: true,
        product: product.name, qty,
        unit_price: product.price,
        total: round2(product.price * qty),
        stock_left: product.qty - qty,
      })
    },
  }))

  tools.push(betaZodTool({
    name: 'record_return',
    description: 'Record a return — reverses a sale and adds stock back.',
    inputSchema: z.object({
      product_name: z.string(),
      qty: z.number().int().positive(),
    }),
    run: async ({ product_name, qty }) => {
      const products = await getProducts(productRepo, store.id)
      const match = fuzzyMatch(product_name, products.map(p => ({ id: p.id, name: p.name })))
      if (!match) return JSON.stringify({ ok: false, error: `No product matching "${product_name}"` })
      const product = products.find(p => p.id === match.id)!
      await runRecordSale(saleRepo, productRepo, alertRepo, store, {
        productId: product.id,
        qty,
        priceAtSale: product.price,
        type: 'return',
        channel: channel === 'whatsapp' ? 'whatsapp' : 'app',
      })
      return JSON.stringify({
        ok: true,
        product: product.name,
        qty_returned: qty,
        refunded: round2(product.price * qty),
      })
    },
  }))

  // ── Write: operational (restock, expense, wastage) ────────────────────
  tools.push(betaZodTool({
    name: 'record_restock',
    description: 'Record a restock — adds stock to a product and logs the cost. Fuzzy-matches product name.',
    inputSchema: z.object({
      product_name: z.string(),
      qty: z.number().positive(),
      cost_per_unit: z.number().nonnegative().optional().describe('Per-unit cost. Defaults to the current product cost if omitted.'),
      supplier_name: z.string().optional(),
    }),
    run: async ({ product_name, qty, cost_per_unit, supplier_name }) => {
      const products = await getProducts(productRepo, store.id)
      const match = fuzzyMatch(product_name, products.map(p => ({ id: p.id, name: p.name })))
      if (!match) {
        return JSON.stringify({
          ok: false, error: `No product matching "${product_name}"`,
          suggestions: products.slice(0, 5).map(p => p.name),
        })
      }
      const product = products.find(p => p.id === match.id)!
      const unitCost = cost_per_unit ?? product.cost

      // Resolve supplier by fuzzy name match if provided.
      let supplierId: string | null = null
      if (supplier_name) {
        const { data: suppliers } = await supabase
          .from('suppliers').select('id, name')
          .eq('store_id', store.id).is('deleted_at', null)
        const supplierMatch = fuzzyMatch(supplier_name, (suppliers ?? []).map(s => ({ id: s.id, name: s.name })))
        if (supplierMatch) supplierId = supplierMatch.id
      }

      await restockRepo.record(store.id, {
        productId: product.id,
        qtyAdded: qty,
        cost: unitCost,
        ...(supplierId ? { supplierId } : {}),
      })

      return JSON.stringify({
        ok: true,
        product: product.name,
        qty_added: qty,
        cost_per_unit: round2(unitCost),
        total_cost: round2(unitCost * qty),
        new_stock: round2(product.qty + qty),
        supplier: supplier_name ?? null,
      })
    },
  }))

  tools.push(betaZodTool({
    name: 'record_expense',
    description: 'Log a business expense. Categories the owner typically uses: rent, transport, electricity, wages, stock, marketing, other.',
    inputSchema: z.object({
      category: z.string().describe("e.g. 'rent', 'transport', 'electricity', 'wages', 'stock', 'other'"),
      description: z.string(),
      amount: z.number().positive(),
    }),
    run: async ({ category, description, amount }) => {
      await expenseRepo.create(store.id, {
        category: category.toLowerCase().trim(),
        description,
        amount,
      })
      return JSON.stringify({
        ok: true,
        category, description,
        amount: round2(amount),
      })
    },
  }))

  tools.push(betaZodTool({
    name: 'record_wastage',
    description: 'Log a product as wasted (expired, damaged, theft, other). Decrements stock; the cost is captured for the P&L.',
    inputSchema: z.object({
      product_name: z.string(),
      qty: z.number().positive(),
      reason: z.enum(['expired', 'damaged', 'theft', 'other']).default('other'),
      notes: z.string().optional(),
    }),
    run: async ({ product_name, qty, reason, notes }) => {
      const products = await getProducts(productRepo, store.id)
      const match = fuzzyMatch(product_name, products.map(p => ({ id: p.id, name: p.name })))
      if (!match) return JSON.stringify({ ok: false, error: `No product matching "${product_name}"` })
      const product = products.find(p => p.id === match.id)!
      if (product.qty < qty) {
        return JSON.stringify({ ok: false, error: `Only ${product.qty} ${product.name} on hand` })
      }
      await wastageRepo.record(store.id, {
        productId: product.id,
        qty,
        reason,
        ...(notes ? { notes } : {}),
        costAtLoss: product.cost,
      })
      return JSON.stringify({
        ok: true,
        product: product.name,
        qty_wasted: qty,
        reason,
        cost_lost: round2(product.cost * qty),
      })
    },
  }))

  return tools
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// Re-export so callers don't need a separate import.
export type { ToolContext } from './types'
export type { GateId }
