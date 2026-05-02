import { describe, expect, it } from 'vitest'
import { matchStatement } from './matchStatement'
import { BankStatementLine } from '@/lib/csv-bank-statement'
import { Invoice } from '@/domain/entities/invoice'
import { Expense } from '@/domain/entities/expense'

function makeLine(overrides: Partial<BankStatementLine> = {}): BankStatementLine {
  return {
    rowNumber: 2,
    date: '2026-04-15',
    description: 'EFT IN',
    amount: 100,
    reference: null,
    ...overrides,
  }
}

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'inv-1',
    storeId: 's1',
    customerId: 'c1',
    customerName: 'Acme Co',
    invoiceNumber: 1042,
    status: 'sent',
    issuedAt: '2026-04-01T00:00:00Z',
    dueAt: '2026-04-30T00:00:00Z',
    lineItems: [],
    subtotalExcl: 2000,
    vatAmount: 300,
    total: 2300,
    amountPaid: 0,
    notes: null,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
    ...overrides,
  }
}

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    storeId: 's1',
    category: 'transport',
    description: 'Petrol',
    amount: 500,
    recordedAt: '2026-04-15T00:00:00Z',
    createdAt: '2026-04-15T00:00:00Z',
    ...overrides,
  }
}

describe('matchStatement — invoice matching', () => {
  it('marks "high" when invoice number is in description and amount equals balance', () => {
    const lines = [makeLine({ amount: 2300, description: 'EFT INVOICE 1042 ACME' })]
    const result = matchStatement(lines, [makeInvoice()], [])
    expect(result[0].best?.confidence).toBe('high')
    expect(result[0].best?.kind).toBe('invoice')
  })

  it('marks "high" when amount matches and customer name is in description', () => {
    const lines = [makeLine({ amount: 2300, description: 'EFT FROM ACME CO' })]
    const result = matchStatement(lines, [makeInvoice()], [])
    expect(result[0].best?.confidence).toBe('high')
  })

  it('marks "medium" when only amount matches outstanding balance', () => {
    const lines = [makeLine({ amount: 2300, description: 'BANK TRANSFER' })]
    const result = matchStatement(lines, [makeInvoice()], [])
    expect(result[0].best?.confidence).toBe('medium')
  })

  it('uses balance (after partial payment), not total, for amount comparison', () => {
    // Total 2300, already paid 800 → balance 1500. Bank deposit of 1500 should match.
    const lines = [makeLine({ amount: 1500, description: 'EFT' })]
    const result = matchStatement(lines, [makeInvoice({ amountPaid: 800 })], [])
    expect(result[0].best?.confidence).toBe('medium')
    expect((result[0].best as { balance: number }).balance).toBe(1500)
  })

  it('skips invoices with no outstanding balance', () => {
    const lines = [makeLine({ amount: 2300 })]
    const result = matchStatement(lines, [makeInvoice({ amountPaid: 2300 })], [])
    expect(result[0].best).toBeNull()
  })

  it('returns no match when amount and reference both miss', () => {
    const lines = [makeLine({ amount: 999, description: 'random' })]
    const result = matchStatement(lines, [makeInvoice()], [])
    expect(result[0].best).toBeNull()
  })

  it('ranks the best candidate when multiple invoices share an amount', () => {
    // Two invoices with identical balance, but only one has its number in the description.
    const inv1 = makeInvoice({ id: 'inv-1', invoiceNumber: 1042 })
    const inv2 = makeInvoice({ id: 'inv-2', invoiceNumber: 1099 })
    const lines = [makeLine({ amount: 2300, description: 'EFT INV 1099' })]
    const result = matchStatement(lines, [inv1, inv2], [])
    expect((result[0].best as { invoiceId: string }).invoiceId).toBe('inv-2')
    expect(result[0].best?.confidence).toBe('high')
    expect(result[0].candidates).toHaveLength(2) // both surfaced as candidates
  })

  it('ignores debits (negative amounts) when matching invoices', () => {
    const lines = [makeLine({ amount: -2300, description: 'PAYMENT 1042' })]
    const result = matchStatement(lines, [makeInvoice()], [])
    // Negative amount should be matched against expenses, not invoices.
    expect(result[0].best?.kind).not.toBe('invoice')
  })
})

describe('matchStatement — expense matching', () => {
  it('marks "high" when amount + date both match an expense within 1 day', () => {
    const lines = [makeLine({ amount: -500, date: '2026-04-15' })]
    const result = matchStatement(lines, [], [makeExpense()])
    expect(result[0].best?.kind).toBe('expense')
    expect(result[0].best?.confidence).toBe('high')
  })

  it('marks "medium" when date is 7 days off but amount matches', () => {
    const lines = [makeLine({ amount: -500, date: '2026-04-22' })]
    const result = matchStatement(lines, [], [makeExpense({ recordedAt: '2026-04-15T00:00:00Z' })])
    expect(result[0].best?.confidence).toBe('medium')
  })

  it('returns no match when amount differs', () => {
    const lines = [makeLine({ amount: -123, date: '2026-04-15' })]
    const result = matchStatement(lines, [], [makeExpense()])
    expect(result[0].best).toBeNull()
  })

  it('ignores credits when matching expenses', () => {
    const lines = [makeLine({ amount: 500 })]
    const result = matchStatement(lines, [], [makeExpense()])
    expect(result[0].best).not.toMatchObject({ kind: 'expense' })
  })
})

describe('matchStatement — edge cases', () => {
  it('returns one entry per statement line, with no matches when both lists are empty', () => {
    const lines = [makeLine({ amount: 100 }), makeLine({ amount: -50 })]
    const result = matchStatement(lines, [], [])
    expect(result).toHaveLength(2)
    expect(result.every((r) => r.best === null)).toBe(true)
  })
})
