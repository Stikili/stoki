/**
 * 30-day cash-flow forecast — turns aged-receivables, aged-payables, recurring
 * expenses and recent trading averages into a day-by-day cash projection.
 *
 * The point of view is the owner asking "will I have enough cash on Friday?".
 * It is intentionally conservative: confirmed dues land on their dueAt date;
 * sales and variable expenses extrapolate from the last 7 days' average; no
 * cleverness about seasonality. Owners can read the assumption strip on the
 * page and pin or skip the obvious one-offs (left to a follow-up).
 *
 * Pure — no DB, no Date.now(). Caller supplies `now` and pre-fetched repos
 * unwound into plain values so this module stays trivially testable.
 */

import { type Invoice, balanceOf as invoiceBalance } from '@/domain/entities/invoice'
import { type SupplierBill, balanceOf as billBalance } from '@/domain/entities/supplier-bill'
import {
  type RecurringExpense,
  nextOccurrence,
} from '@/domain/entities/recurring-expense'

export interface CashflowInputs {
  startingCash: number | null
  /** Open B2B invoices — dues land on `dueAt` as inflows. */
  openInvoices: Invoice[]
  /** Open supplier bills — dues land on `dueAt` as outflows. */
  openBills: SupplierBill[]
  /** Active recurring rules — every occurrence in window posts as an outflow. */
  recurringExpenses: RecurringExpense[]
  /** Rand/day baseline pulled from the last 7 days' takings. */
  avgDailyRevenue: number
  /** Rand/day baseline pulled from the last 30 days of variable expenses. */
  avgDailyVariableExpense: number
  /** Forecast horizon (days). Default 30. */
  windowDays?: number
  now: Date
}

export interface DailyForecast {
  date: Date
  /** Variable trading inflow projected from avg revenue. */
  baseInflow: number
  /** Confirmed inflows from invoice dues landing this day. */
  confirmedInflow: number
  /** Variable trading outflow projected from avg variable expense. */
  baseOutflow: number
  /** Confirmed outflows from supplier-bill dues + recurring expenses. */
  confirmedOutflow: number
  net: number
  runningBalance: number
}

export interface CashflowForecast {
  days: DailyForecast[]
  startingCash: number
  /** Lowest running balance hit anywhere in the window. */
  minBalance: number
  minBalanceDate: Date | null
  /** First date (if any) where projected balance dips below zero. */
  firstDeficitDate: Date | null
  /** Sum of confirmed dues over the window — what the owner *owes*. */
  totalConfirmedOutflow: number
  /** Sum of confirmed inflows — what the owner is *expected to collect*. */
  totalConfirmedInflow: number
}

function stripTime(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

export function buildForecast(input: CashflowInputs): CashflowForecast {
  const windowDays = input.windowDays ?? 30
  const startDate = stripTime(input.now)
  const startingCash = input.startingCash ?? 0

  // Pre-compute all occurrence dates for recurring rules within the window.
  // A rule whose next_due_at is already inside the window can fire multiple
  // times for short-cadence cases (weekly + 30-day window = up to 5 hits).
  const recurringHits: { date: Date; amount: number }[] = []
  const horizon = new Date(startDate)
  horizon.setDate(horizon.getDate() + windowDays - 1)
  for (const rule of input.recurringExpenses) {
    if (!rule.active) continue
    let cursor = new Date(rule.nextDueAt)
    let guard = 0
    while (cursor.getTime() <= horizon.getTime() && guard < 64) {
      const stripped = stripTime(cursor)
      if (stripped.getTime() >= startDate.getTime()) {
        recurringHits.push({ date: stripped, amount: rule.amount })
      }
      cursor = nextOccurrence(rule.frequency, rule.dayValue, cursor)
      guard++
    }
  }

  let runningBalance = startingCash
  let minBalance = startingCash
  let minBalanceDate: Date | null = null
  let firstDeficitDate: Date | null = null
  let totalConfirmedOutflow = 0
  let totalConfirmedInflow = 0

  const days: DailyForecast[] = []
  for (let i = 0; i < windowDays; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)

    const baseInflow = input.avgDailyRevenue
    const baseOutflow = input.avgDailyVariableExpense

    let confirmedInflow = 0
    for (const inv of input.openInvoices) {
      if (sameDay(stripTime(new Date(inv.dueAt)), date)) {
        confirmedInflow += invoiceBalance(inv)
      }
    }

    let confirmedOutflow = 0
    for (const bill of input.openBills) {
      if (sameDay(stripTime(new Date(bill.dueAt)), date)) {
        confirmedOutflow += billBalance(bill)
      }
    }
    for (const hit of recurringHits) {
      if (sameDay(hit.date, date)) confirmedOutflow += hit.amount
    }

    totalConfirmedInflow += confirmedInflow
    totalConfirmedOutflow += confirmedOutflow

    const net = baseInflow + confirmedInflow - baseOutflow - confirmedOutflow
    runningBalance += net

    if (runningBalance < minBalance) {
      minBalance = runningBalance
      minBalanceDate = date
    }
    if (firstDeficitDate === null && runningBalance < 0) {
      firstDeficitDate = date
    }

    days.push({
      date,
      baseInflow,
      confirmedInflow,
      baseOutflow,
      confirmedOutflow,
      net,
      runningBalance,
    })
  }

  return {
    days,
    startingCash,
    minBalance,
    minBalanceDate,
    firstDeficitDate,
    totalConfirmedOutflow,
    totalConfirmedInflow,
  }
}
