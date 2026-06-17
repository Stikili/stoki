import { describe, it, expect } from 'vitest'
import { buildForecast } from './cashflow-forecast'
import type { Invoice } from '@/domain/entities/invoice'
import type { SupplierBill } from '@/domain/entities/supplier-bill'
import type { RecurringExpense } from '@/domain/entities/recurring-expense'

function inv(p: Partial<Invoice> = {}): Invoice {
  return {
    id: 'i', storeId: 's', customerId: 'c', customerName: 'C',
    invoiceNumber: 1, status: 'sent',
    issuedAt: '2026-06-01T00:00:00Z', dueAt: '2026-06-20T00:00:00Z',
    lineItems: [], subtotalExcl: 1000, vatAmount: 150, total: 1150, amountPaid: 0,
    notes: null, createdAt: '2026-06-01', updatedAt: '2026-06-01',
    ...p,
  }
}

function bill(p: Partial<SupplierBill> = {}): SupplierBill {
  return {
    id: 'b', storeId: 's', supplierId: 'sup', supplierName: 'Sup',
    reference: 'R', issuedAt: '2026-06-01T00:00:00Z', dueAt: '2026-06-25T00:00:00Z',
    total: 500, amountPaid: 0, notes: null,
    createdAt: '2026-06-01', updatedAt: '2026-06-01',
    ...p,
  }
}

function rule(p: Partial<RecurringExpense> = {}): RecurringExpense {
  return {
    id: 'r', storeId: 's',
    category: 'rent', description: 'Shop rent', amount: 3000,
    isCapital: false, frequency: 'monthly', dayValue: 1,
    nextDueAt: '2026-06-22T00:00:00Z', lastPostedAt: null, active: true,
    createdAt: '2026-06-01', updatedAt: '2026-06-01',
    ...p,
  }
}

describe('buildForecast — basics', () => {
  const now = new Date(2026, 5, 15) // 15 Jun 2026

  it('produces one day per windowDay', () => {
    const f = buildForecast({
      startingCash: 1000,
      openInvoices: [], openBills: [], recurringExpenses: [],
      avgDailyRevenue: 0, avgDailyVariableExpense: 0,
      windowDays: 30, now,
    })
    expect(f.days).toHaveLength(30)
  })

  it('seeds running balance from startingCash', () => {
    const f = buildForecast({
      startingCash: 500,
      openInvoices: [], openBills: [], recurringExpenses: [],
      avgDailyRevenue: 0, avgDailyVariableExpense: 0,
      windowDays: 3, now,
    })
    expect(f.startingCash).toBe(500)
    expect(f.days[0].runningBalance).toBe(500)
  })

  it('treats null startingCash as 0', () => {
    const f = buildForecast({
      startingCash: null,
      openInvoices: [], openBills: [], recurringExpenses: [],
      avgDailyRevenue: 0, avgDailyVariableExpense: 0,
      windowDays: 3, now,
    })
    expect(f.startingCash).toBe(0)
  })
})

describe('buildForecast — confirmed flows', () => {
  const now = new Date(2026, 5, 15)

  it('lands an invoice due on its dueAt as confirmed inflow', () => {
    const f = buildForecast({
      startingCash: 0,
      openInvoices: [inv({ dueAt: '2026-06-20T00:00:00Z', total: 1150 })],
      openBills: [], recurringExpenses: [],
      avgDailyRevenue: 0, avgDailyVariableExpense: 0,
      windowDays: 30, now,
    })
    const day20 = f.days.find(d => d.date.getDate() === 20)!
    expect(day20.confirmedInflow).toBe(1150)
    expect(f.totalConfirmedInflow).toBe(1150)
  })

  it('lands a supplier bill on its dueAt as confirmed outflow', () => {
    const f = buildForecast({
      startingCash: 0,
      openInvoices: [],
      openBills: [bill({ dueAt: '2026-06-25T00:00:00Z', total: 500 })],
      recurringExpenses: [],
      avgDailyRevenue: 0, avgDailyVariableExpense: 0,
      windowDays: 30, now,
    })
    const day25 = f.days.find(d => d.date.getDate() === 25)!
    expect(day25.confirmedOutflow).toBe(500)
    expect(f.totalConfirmedOutflow).toBe(500)
  })

  it('only counts the unpaid balance, not the gross total', () => {
    const f = buildForecast({
      startingCash: 0,
      openInvoices: [inv({ dueAt: '2026-06-20T00:00:00Z', total: 1000, amountPaid: 400 })],
      openBills: [], recurringExpenses: [],
      avgDailyRevenue: 0, avgDailyVariableExpense: 0,
      windowDays: 30, now,
    })
    expect(f.totalConfirmedInflow).toBe(600)
  })

  it('lands a monthly recurring expense on every occurrence in window', () => {
    // Rule: amount 3000, frequency monthly, day 1. nextDueAt = 1 Jul.
    // 30-day window from 15 Jun → only one occurrence (Jul 1).
    const f = buildForecast({
      startingCash: 0,
      openInvoices: [], openBills: [],
      recurringExpenses: [rule({ nextDueAt: '2026-07-01T00:00:00Z', amount: 3000 })],
      avgDailyRevenue: 0, avgDailyVariableExpense: 0,
      windowDays: 30, now,
    })
    const julDay = f.days.find(d => d.date.getMonth() === 6 && d.date.getDate() === 1)!
    expect(julDay.confirmedOutflow).toBe(3000)
    expect(f.totalConfirmedOutflow).toBe(3000)
  })

  it('multi-fires a weekly recurring expense across the window', () => {
    // Weekly rule, every Friday (day 5), starting Fri 2026-06-19, amount 200.
    // 30-day window starts Mon 15 Jun and ends Tue 14 Jul (inclusive).
    // Fridays in window: 19 Jun, 26 Jun, 3 Jul, 10 Jul = 4 hits.
    const f = buildForecast({
      startingCash: 0,
      openInvoices: [], openBills: [],
      recurringExpenses: [rule({
        frequency: 'weekly', dayValue: 5,
        nextDueAt: '2026-06-19T00:00:00Z', amount: 200,
      })],
      avgDailyRevenue: 0, avgDailyVariableExpense: 0,
      windowDays: 30, now,
    })
    expect(f.totalConfirmedOutflow).toBe(800)
  })
})

describe('buildForecast — deficit detection', () => {
  const now = new Date(2026, 5, 15)

  it('flags the first day balance dips below zero', () => {
    const f = buildForecast({
      startingCash: 500,
      openInvoices: [], openBills: [],
      // 200/day expenses, no inflows. Day 1: 300. Day 2: 100. Day 3: -100 (deficit).
      recurringExpenses: [],
      avgDailyRevenue: 0, avgDailyVariableExpense: 200,
      windowDays: 5, now,
    })
    expect(f.firstDeficitDate).not.toBeNull()
    expect(f.firstDeficitDate!.getDate()).toBe(17) // 15 + 2
  })

  it('reports no deficit when balance stays positive', () => {
    const f = buildForecast({
      startingCash: 5000,
      openInvoices: [], openBills: [], recurringExpenses: [],
      avgDailyRevenue: 100, avgDailyVariableExpense: 50,
      windowDays: 30, now,
    })
    expect(f.firstDeficitDate).toBeNull()
  })

  it('records the worst-point balance and date', () => {
    const f = buildForecast({
      startingCash: 1000,
      openInvoices: [],
      openBills: [bill({ dueAt: '2026-06-20T00:00:00Z', total: 2000 })],
      recurringExpenses: [],
      avgDailyRevenue: 0, avgDailyVariableExpense: 0,
      windowDays: 10, now,
    })
    expect(f.minBalance).toBe(-1000)
    expect(f.minBalanceDate!.getDate()).toBe(20)
  })
})
