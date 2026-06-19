import { describe, it, expect } from 'vitest'
import { buildBalanceSheet } from './balance-sheet'
import type { Product } from '@/domain/entities/product'
import type { Invoice } from '@/domain/entities/invoice'
import type { Debtor } from '@/domain/entities/debtor'
import type { SupplierBill } from '@/domain/entities/supplier-bill'
import type { FixedAsset } from '@/domain/entities/fixed-asset'

function p(o: Partial<Product> = {}): Product {
  return {
    id: 'x', storeId: 's', name: 'X',
    price: 20, cost: 10, qty: 5, reorderPoint: 1,
    sku: null, photoUrl: null, expiryDate: null,
    vatInclusive: true, isAirtime: false, isBundle: false,
    isWeighable: false, unitLabel: 'each', vatCode: 'standard',
    createdAt: '', updatedAt: '',
    ...o,
  }
}
function inv(o: Partial<Invoice> = {}): Invoice {
  return {
    id: 'i', storeId: 's', customerId: 'c', customerName: 'C',
    invoiceNumber: 1, status: 'sent',
    issuedAt: '', dueAt: '2026-07-01T00:00:00Z',
    lineItems: [], subtotalExcl: 0, vatAmount: 0, total: 1000, amountPaid: 200,
    notes: null, createdAt: '', updatedAt: '',
    ...o,
  }
}
function bill(o: Partial<SupplierBill> = {}): SupplierBill {
  return {
    id: 'b', storeId: 's', supplierId: 's1', supplierName: 'S',
    reference: null, issuedAt: '', dueAt: '2026-07-01T00:00:00Z',
    total: 500, amountPaid: 100, notes: null,
    createdAt: '', updatedAt: '',
    ...o,
  }
}
function asset(o: Partial<FixedAsset> = {}): FixedAsset {
  return {
    id: 'a', storeId: 's', name: 'Fridge', category: 'fridge',
    cost: 12_000, residualValue: 0, usefulLifeMonths: 60,
    purchaseDate: '2026-01-01', status: 'active', disposedAt: null,
    notes: null, createdAt: '', updatedAt: '',
    ...o,
  }
}
function debtor(o: Partial<Debtor> = {}): Debtor {
  return {
    id: 'd', storeId: 's', name: 'D', phone: null, address: null,
    totalOwed: 250, lastRemindedAt: null,
    createdAt: '', updatedAt: '',
    ...o,
  }
}

describe('buildBalanceSheet', () => {
  const asOf = new Date(2026, 6, 1)

  it('treats null cash as zero', () => {
    const bs = buildBalanceSheet({
      asOf, cashBalance: null, products: [], openInvoices: [],
      debtors: [], openBills: [], assets: [],
    })
    expect(bs.cash).toBe(0)
    expect(bs.totalAssets).toBe(0)
  })

  it('sums inventory at cost × qty', () => {
    const bs = buildBalanceSheet({
      asOf, cashBalance: 0,
      products: [
        p({ id: 'a', cost: 10, qty: 5 }),  // 50
        p({ id: 'b', cost: 20, qty: 3 }),  // 60
        p({ id: 'c', cost: 30, qty: 0 }),  // ignored
      ],
      openInvoices: [], debtors: [], openBills: [], assets: [],
    })
    expect(bs.inventory).toBe(110)
  })

  it('excludes bundles from inventory valuation', () => {
    const bs = buildBalanceSheet({
      asOf, cashBalance: 0,
      products: [
        p({ id: 'a', cost: 10, qty: 5, isBundle: false }),
        p({ id: 'b', cost: 99, qty: 5, isBundle: true  }),
      ],
      openInvoices: [], debtors: [], openBills: [], assets: [],
    })
    expect(bs.inventory).toBe(50)
  })

  it('sums invoice + credit-book receivables separately', () => {
    const bs = buildBalanceSheet({
      asOf, cashBalance: 0, products: [],
      openInvoices: [inv({ total: 1000, amountPaid: 200 })],
      debtors: [debtor({ totalOwed: 250 })],
      openBills: [], assets: [],
    })
    expect(bs.invoiceReceivables).toBe(800)
    expect(bs.creditBookReceivables).toBe(250)
  })

  it('sums net book value of active assets, skips disposed', () => {
    const bs = buildBalanceSheet({
      asOf, cashBalance: 0, products: [], openInvoices: [], debtors: [], openBills: [],
      assets: [
        asset({ id: 'a', purchaseDate: '2026-01-01', cost: 12_000, usefulLifeMonths: 60 }),
        asset({ id: 'b', purchaseDate: '2026-01-01', cost: 6_000,  usefulLifeMonths: 60, status: 'disposed' }),
      ],
    })
    // Asset 'a' after 6 months: 12000 − 200×6 = 10800
    expect(bs.fixedAssetsBook).toBe(10_800)
  })

  it('sums supplier-bill payables', () => {
    const bs = buildBalanceSheet({
      asOf, cashBalance: 0, products: [], openInvoices: [], debtors: [],
      openBills: [bill({ total: 500, amountPaid: 100 })],
      assets: [],
    })
    expect(bs.supplierPayables).toBe(400)
  })

  it('equity = total assets − total liabilities', () => {
    const bs = buildBalanceSheet({
      asOf, cashBalance: 1000,
      products: [p({ cost: 10, qty: 5 })],
      openInvoices: [inv({ total: 1000, amountPaid: 0 })],
      debtors: [debtor({ totalOwed: 200 })],
      openBills: [bill({ total: 500, amountPaid: 0 })],
      assets: [],
    })
    expect(bs.totalAssets).toBe(1000 + 50 + 1000 + 200)
    expect(bs.totalLiabilities).toBe(500)
    expect(bs.ownersEquity).toBe(1750)
  })
})
