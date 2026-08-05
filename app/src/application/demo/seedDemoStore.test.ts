import { describe, it, expect } from 'vitest'
import { _DEMO_PROFILES_FOR_TESTS as PROFILES } from './seedDemoStore'

/**
 * These profiles are seeded into every new account, so a bad one ships to
 * every user at once and is visible on the first screen they ever see.
 * Asserting the invariants here is far cheaper than noticing later.
 */

const ALLOWED_CATEGORIES = ['spaza', 'general_dealer', 'food_stall', 'other']

describe('demo profiles', () => {
  it('seeds three distinct verticals', () => {
    expect(PROFILES).toHaveLength(3)
    expect(new Set(PROFILES.map(p => p.store.name)).size).toBe(3)
  })

  it('uses only categories the schema check constraint allows', () => {
    // stores_category_check rejects anything else — a bad value fails the
    // insert at signup, which is the worst possible moment to find out.
    for (const p of PROFILES) {
      expect(ALLOWED_CATEGORIES).toContain(p.store.category)
    }
  })

  it('gives every profile a distinct rng seed so the demos do not look identical', () => {
    const seeds = PROFILES.map(p => p.rng_seed)
    expect(new Set(seeds).size).toBe(seeds.length)
  })

  it('never leaves a sellable product at qty 0, which would render as out-of-stock', () => {
    // productStatus() treats qty <= 0 as 'out'. A demo store that opens on a
    // wall of out-of-stock warnings is worse than no demo.
    for (const p of PROFILES) {
      for (const product of p.products) {
        if (product.is_bundle || product.is_airtime) continue // stock-less by design
        expect(product.qty, `${p.store.name} / ${product.name}`).toBeGreaterThan(0)
      }
    }
  })

  it('declares a VAT number whenever a store is VAT-registered', () => {
    for (const p of PROFILES) {
      if (p.store.vat_registered) {
        expect(p.store.vat_number, p.store.name).toBeTruthy()
      }
    }
  })

  it('only references products that exist in the same profile', () => {
    // Restocks, wastage and airtime PINs are wired by product name after
    // insert — a typo silently drops the row rather than erroring.
    for (const p of PROFILES) {
      const names = new Set(p.products.map(x => x.name))
      for (const r of p.restocks) expect(names, p.store.name).toContain(r.product_name)
      for (const w of p.wastage) expect(names, p.store.name).toContain(w.product_name)
      for (const a of p.airtime_pins) expect(names, p.store.name).toContain(a.product_name)
    }
  })

  it('only references suppliers that exist in the same profile', () => {
    for (const p of PROFILES) {
      const suppliers = new Set(p.suppliers.map(s => s.name))
      for (const r of p.restocks) expect(suppliers, p.store.name).toContain(r.supplier_name)
    }
  })

  it('only invoices customers that exist in the same profile', () => {
    for (const p of PROFILES) {
      const customers = new Set(p.customers.map(c => c.name))
      for (const inv of p.invoices) expect(customers, p.store.name).toContain(inv.customer_name)
    }
  })

  it('never records a partial payment larger than the invoice total', () => {
    for (const p of PROFILES) {
      for (const inv of p.invoices) {
        if (inv.paid_amount === undefined) continue
        const total = inv.lines.reduce((sum, l) => sum + l.qty * l.unit_price, 0)
        expect(inv.paid_amount, `${p.store.name} / ${inv.customer_name}`).toBeLessThan(total)
      }
    }
  })

  it('bundles reference components that exist in the same profile', () => {
    for (const p of PROFILES) {
      const names = new Set(p.products.map(x => x.name))
      for (const product of p.products) {
        for (const c of product.bundle_of ?? []) {
          expect(names, `${p.store.name} / ${product.name}`).toContain(c.component_name)
        }
      }
    }
  })
})

describe('professional-services profile', () => {
  const advisory = PROFILES.find(p => p.store.name === 'Stoki Demo Advisory')!

  it('exists as the non-retail persona', () => {
    expect(advisory).toBeDefined()
  })

  it('holds no inventory value — services have no cost of goods', () => {
    // Inventory valuation sums qty × cost. A nominal cost here would invent
    // a balance-sheet asset a services firm does not have.
    for (const product of advisory.products) {
      expect(product.cost, product.name).toBe(0)
    }
  })

  it('carries no stock-keeping artefacts', () => {
    expect(advisory.restocks).toEqual([])
    expect(advisory.wastage).toEqual([])
    expect(advisory.airtime_pins).toEqual([])
    expect(advisory.seed_stocktake).toBe(false)
  })

  it('bills through invoices rather than an informal credit book', () => {
    expect(advisory.debtors).toEqual([])
    expect(advisory.invoices.length).toBeGreaterThanOrEqual(4)
  })

  it('shows the full invoice lifecycle so the demo dashboard has something to say', () => {
    const statuses = new Set(advisory.invoices.map(i => i.status))
    expect(statuses).toContain('paid')
    expect(statuses).toContain('sent')
    expect(statuses).toContain('draft')
  })

  it('includes an overdue invoice so aged receivables is not empty', () => {
    const overdue = advisory.invoices.filter(i => i.status === 'sent' && i.due_in_days < 0)
    expect(overdue.length).toBeGreaterThan(0)
  })

  it('settles almost entirely by EFT, not card at a counter', () => {
    const eft = advisory.payment_methods.filter(m => m === 'eft').length
    expect(eft / advisory.payment_methods.length).toBeGreaterThan(0.5)
  })
})
