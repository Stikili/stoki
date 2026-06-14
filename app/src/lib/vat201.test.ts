import { describe, it, expect } from 'vitest'
import { computeVat201, vatFraction } from './vat201'
import type { Sale } from '@/domain/entities/sale'
import type { Restock } from '@/domain/entities/restock'
import type { Expense } from '@/domain/entities/expense'

function makeSale(p: Partial<Sale> = {}): Sale {
  return {
    id: p.id ?? 's',
    storeId: 'store-1',
    productId: 'p',
    productName: 'X',
    qty: 1,
    priceAtSale: 100,
    costAtSale: 50,
    vatAmount: 13.04, // 100 incl × 15/115
    vatCode: 'standard',
    invoiceNumber: null,
    type: 'sale',
    channel: 'app',
    paymentMethod: 'cash',
    recordedAt: '2026-06-01T00:00:00Z',
    createdAt: '2026-06-01T00:00:00Z',
    ...p,
  }
}

function makeRestock(p: Partial<Restock> = {}): Restock {
  return {
    id: 'r',
    storeId: 'store-1',
    productId: 'p',
    productName: 'X',
    qtyAdded: 10,
    cost: 5,
    supplierId: null,
    supplierName: null,
    notes: null,
    recordedAt: '2026-06-01T00:00:00Z',
    createdAt: '2026-06-01T00:00:00Z',
    ...p,
  }
}

function makeExpense(p: Partial<Expense> = {}): Expense {
  return {
    id: 'e',
    storeId: 'store-1',
    category: 'utilities',
    description: 'electricity',
    amount: 1150,
    isCapital: false,
    recordedAt: '2026-06-01T00:00:00Z',
    createdAt: '2026-06-01T00:00:00Z',
    ...p,
  }
}

describe('vatFraction', () => {
  it('extracts the VAT portion from a VAT-inclusive amount', () => {
    expect(vatFraction(115, 0.15)).toBeCloseTo(15, 2)
    expect(vatFraction(230, 0.15)).toBeCloseTo(30, 2)
  })

  it('returns 0 for zero or negative gross', () => {
    expect(vatFraction(0, 0.15)).toBe(0)
    expect(vatFraction(-100, 0.15)).toBe(0)
  })
})

describe('computeVat201 — output side', () => {
  it('classifies standard sales into block 1 and accumulates output VAT in block 4', () => {
    const result = computeVat201({
      sales: [makeSale({ priceAtSale: 100, vatAmount: 13.04, vatCode: 'standard' })],
      restocks: [],
      expenses: [],
      vatRate: 0.15,
    })
    expect(result.block1_standardSalesIncl).toBeCloseTo(100, 2)
    expect(result.block4_outputVat).toBeCloseTo(13.04, 2)
    expect(result.block2_zeroRatedSales).toBe(0)
  })

  it('classifies zero-rated sales into block 2 with no VAT', () => {
    const result = computeVat201({
      sales: [makeSale({ priceAtSale: 50, vatAmount: 0, vatCode: 'zero' })],
      restocks: [],
      expenses: [],
      vatRate: 0.15,
    })
    expect(result.block2_zeroRatedSales).toBe(50)
    expect(result.block4_outputVat).toBe(0)
  })

  it('classifies exempt sales into block 3 with no VAT', () => {
    const result = computeVat201({
      sales: [makeSale({ priceAtSale: 30, vatAmount: 0, vatCode: 'exempt' })],
      restocks: [],
      expenses: [],
      vatRate: 0.15,
    })
    expect(result.block3_exemptSales).toBe(30)
    expect(result.block4_outputVat).toBe(0)
  })

  it('treats legacy NULL vat_code rows as standard', () => {
    const result = computeVat201({
      sales: [makeSale({ priceAtSale: 200, vatAmount: 26.09, vatCode: null })],
      restocks: [],
      expenses: [],
      vatRate: 0.15,
    })
    expect(result.block1_standardSalesIncl).toBe(200)
    expect(result.block4_outputVat).toBeCloseTo(26.09, 2)
  })

  it('subtracts returns from the appropriate block', () => {
    const result = computeVat201({
      sales: [
        makeSale({ id: 'a', priceAtSale: 100, vatAmount: 13.04 }),
        makeSale({ id: 'b', priceAtSale: 40, vatAmount: 5.22, type: 'return' }),
      ],
      restocks: [],
      expenses: [],
      vatRate: 0.15,
    })
    expect(result.block1_standardSalesIncl).toBeCloseTo(60, 2)
    expect(result.block4_outputVat).toBeCloseTo(13.04 - 5.22, 2)
  })

  it('handles a mixed-code basket correctly', () => {
    const result = computeVat201({
      sales: [
        makeSale({ id: 'a', priceAtSale: 100, vatAmount: 13.04, vatCode: 'standard' }),
        makeSale({ id: 'b', priceAtSale:  50, vatAmount: 0,     vatCode: 'zero' }),
        makeSale({ id: 'c', priceAtSale:  30, vatAmount: 0,     vatCode: 'exempt' }),
      ],
      restocks: [],
      expenses: [],
      vatRate: 0.15,
    })
    expect(result.block1_standardSalesIncl).toBe(100)
    expect(result.block2_zeroRatedSales).toBe(50)
    expect(result.block3_exemptSales).toBe(30)
    expect(result.totalOutputVat).toBeCloseTo(13.04, 2)
  })
})

describe('computeVat201 — input side', () => {
  it('estimates input VAT on restocks via 15/115', () => {
    const result = computeVat201({
      sales: [],
      restocks: [makeRestock({ cost: 115, qtyAdded: 1 })],
      expenses: [],
      vatRate: 0.15,
    })
    expect(result.block15_otherInputVat).toBeCloseTo(15, 2)
  })

  it('splits expenses into block 14 (capital) and block 15 (operating)', () => {
    const result = computeVat201({
      sales: [],
      restocks: [],
      expenses: [
        makeExpense({ id: 'e1', amount: 1150, isCapital: false }), // R150 input
        makeExpense({ id: 'e2', amount: 2300, isCapital: true  }), // R300 input
      ],
      vatRate: 0.15,
    })
    expect(result.block14_capitalInputVat).toBeCloseTo(300, 2)
    expect(result.block15_otherInputVat).toBeCloseTo(150, 2)
  })

  it('claims input VAT on bad-debt write-off', () => {
    const result = computeVat201({
      sales: [],
      restocks: [],
      expenses: [],
      badDebtWriteOff: 1150,
      vatRate: 0.15,
    })
    expect(result.block18_badDebtInputVat).toBeCloseTo(150, 2)
  })

  it('skips restocks without a recorded cost', () => {
    const result = computeVat201({
      sales: [],
      restocks: [makeRestock({ cost: null })],
      expenses: [],
      vatRate: 0.15,
    })
    expect(result.block15_otherInputVat).toBe(0)
  })
})

describe('computeVat201 — net due', () => {
  it('positive when output > input (owed to SARS)', () => {
    const result = computeVat201({
      sales: [makeSale({ priceAtSale: 1000, vatAmount: 130.43, vatCode: 'standard' })],
      restocks: [],
      expenses: [],
      vatRate: 0.15,
    })
    expect(result.netVatDue).toBeCloseTo(130.43, 2)
  })

  it('negative when input > output (refund from SARS)', () => {
    const result = computeVat201({
      sales: [],
      restocks: [makeRestock({ cost: 1150, qtyAdded: 1 })], // R150 input
      expenses: [],
      vatRate: 0.15,
    })
    expect(result.netVatDue).toBeCloseTo(-150, 2)
  })

  it('end-to-end: standard sales + restocks + capital expense + bad debt', () => {
    const result = computeVat201({
      sales: [
        makeSale({ id: 'a', priceAtSale: 1150, vatAmount: 150, vatCode: 'standard' }),
        makeSale({ id: 'b', priceAtSale: 200,  vatAmount: 0,   vatCode: 'zero' }),
      ],
      restocks: [makeRestock({ cost: 115, qtyAdded: 5 })], // R75 input
      expenses: [
        makeExpense({ id: 'e1', amount: 575,  isCapital: false }), // R75 input
        makeExpense({ id: 'e2', amount: 1150, isCapital: true  }), // R150 input
      ],
      badDebtWriteOff: 230, // R30 input
      vatRate: 0.15,
    })
    expect(result.totalOutputVat).toBe(150)
    expect(result.totalInputVat).toBeCloseTo(75 + 75 + 150 + 30, 2)
    expect(result.netVatDue).toBeCloseTo(150 - 330, 2)
  })
})
