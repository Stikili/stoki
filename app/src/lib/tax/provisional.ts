/**
 * Provisional-tax estimator — turns year-to-date profit into an estimated
 * SARS bill for the current tax year, plus the next provisional-payment
 * deadline and amount.
 *
 * SA tax year runs 1 March → end-Feb. Provisional taxpayers pay twice:
 *   1st period — last day of August  (50 % of estimated annual tax)
 *   2nd period — last day of February (full estimated tax minus what's paid)
 *
 * For sole proprietors (the default) we tax the YTD net profit on the
 * personal-income brackets and subtract the primary rebate (under-65 default).
 * SBC, turnover tax and company are graduated/flat per their own tables.
 *
 * Annualisation is straight-line: ytdProfit × (daysInYear / daysIntoYear).
 * Imperfect for seasonal trade but matches what SARS' own provisional
 * calculator does and gives the owner a real number to provision against.
 */

import type { TaxpayerType } from '@/domain/entities/store'
import {
  bracketsFor,
  COMPANY_RATE_2026,
  PRIMARY_REBATE_2026,
  SECONDARY_REBATE_2026,
  TERTIARY_REBATE_2026,
  type Bracket,
} from './sa-brackets'

export interface ProvisionalEstimate {
  /** Calendar year the tax year ends in (e.g. 2027 for Mar-2026 → Feb-2027). */
  taxYear: number
  taxYearStart: Date
  taxYearEnd: Date
  daysIntoYear: number
  daysInYear: number
  /** Net profit booked so far this tax year (revenue − COGS − expenses). */
  ytdProfit: number
  /** Straight-line projection of full-year profit. */
  annualisedProfit: number
  /** Tax owed on the annualised profit under the chosen taxpayer regime. */
  estimatedAnnualTax: number
  /** Next provisional-payment due date (1st period = end-Aug, 2nd = end-Feb). */
  nextDeadline: Date
  nextPeriod: 1 | 2
  /** What to pay on `nextDeadline` — 50 % of estimated annual at period 1,
   *  the balancing 50 % at period 2 (assuming period 1 was paid in full). */
  nextPaymentAmount: number
}

/** Returns the calendar year the current SA tax year ends in. */
export function currentTaxYear(now: Date): number {
  // Tax year ending Y runs 1 Mar (Y-1) → 28/29 Feb (Y).
  // Months 0-1 (Jan, Feb) still belong to tax year Y; Mar+ belongs to Y+1.
  return now.getMonth() <= 1 ? now.getFullYear() : now.getFullYear() + 1
}

/** Start of the tax year ending in `taxYear` — 1 March of (taxYear - 1). */
export function taxYearStart(taxYear: number): Date {
  return new Date(taxYear - 1, 2, 1) // month index 2 = March
}

/** End of the tax year ending in `taxYear` — last day of February. */
export function taxYearEnd(taxYear: number): Date {
  // Feb 28 or 29 depending on leap year — Date with day 0 of March gives that.
  return new Date(taxYear, 2, 0, 23, 59, 59, 999)
}

/** Whole days between two dates (UTC-safe — ignores DST). */
function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime()
  return Math.max(0, Math.floor(ms / 86_400_000))
}

/** Provisional-payment deadline for the *next* upcoming due date. */
export function nextProvisionalDeadline(now: Date): { date: Date; period: 1 | 2 } {
  const year = now.getFullYear()
  const month = now.getMonth()
  const day = now.getDate()

  // End-of-August in the calendar year that contains the 1st-period deadline.
  // Period 1 is end-Aug of (taxYear - 1); period 2 is end-Feb of taxYear.
  // Cases:
  //   Jan-Feb  → next deadline = 28/29 Feb this calendar year (period 2)
  //   Mar-Aug  → next deadline = 31 Aug this calendar year (period 1)
  //   Sep-Dec  → next deadline = 28/29 Feb next calendar year (period 2)
  if (month <= 1) {
    return { date: new Date(year, 2, 0, 23, 59, 59, 999), period: 2 }
  }
  if (month < 7 || (month === 7 && day <= 31)) {
    return { date: new Date(year, 7, 31, 23, 59, 59, 999), period: 1 }
  }
  return { date: new Date(year + 1, 2, 0, 23, 59, 59, 999), period: 2 }
}

/** Apply a bracket table to a taxable amount. Pure. */
export function taxFromBrackets(taxable: number, brackets: Bracket[]): number {
  if (taxable <= 0) return 0
  let owed = 0
  for (const b of brackets) {
    if (taxable <= b.threshold) break
    const ceiling = b.upTo ?? Infinity
    if (taxable <= ceiling) {
      owed = b.baseTax + (taxable - b.threshold) * b.rate
      break
    }
    // Falls into a higher bracket — record the running total at this bracket's
    // ceiling and keep going. The base-tax convention means we don't need to
    // accumulate here; the next bracket's baseTax already includes us.
    owed = b.baseTax + (ceiling - b.threshold) * b.rate
  }
  return Math.max(0, owed)
}

/** Estimate annual income tax for a given taxable amount under one regime.
 *  `age` only matters for sole_prop rebates (defaults to under-65). */
export function estimateIncomeTax(
  taxable: number,
  type: TaxpayerType,
  age: number = 40,
): number {
  if (taxable <= 0) return 0
  if (type === 'company') return taxable * COMPANY_RATE_2026

  const brackets = bracketsFor(type)
  if (!brackets) return taxable * COMPANY_RATE_2026 // shouldn't hit

  let tax = taxFromBrackets(taxable, brackets)

  if (type === 'sole_prop') {
    let rebate = PRIMARY_REBATE_2026
    if (age >= 65) rebate += SECONDARY_REBATE_2026
    if (age >= 75) rebate += TERTIARY_REBATE_2026
    tax = Math.max(0, tax - rebate)
  }
  // SBC tables already build the R95 750 zero-rate band into bracket 0 — no
  // rebate. Turnover tax is its own self-contained regime.

  return tax
}

/**
 * Build a full provisional estimate from year-to-date profit. `now` is
 * injected for testability — production callers pass `new Date()`.
 */
export function estimateProvisional(
  ytdProfit: number,
  type: TaxpayerType,
  now: Date,
  options: { age?: number } = {},
): ProvisionalEstimate {
  const taxYear = currentTaxYear(now)
  const start = taxYearStart(taxYear)
  const end = taxYearEnd(taxYear)
  const daysIntoYear = Math.max(1, daysBetween(start, now))
  const daysInYear = daysBetween(start, end) + 1 // 365 or 366

  const annualisedProfit = ytdProfit > 0
    ? (ytdProfit * daysInYear) / daysIntoYear
    : 0
  const estimatedAnnualTax = estimateIncomeTax(annualisedProfit, type, options.age)

  const { date: nextDeadline, period: nextPeriod } = nextProvisionalDeadline(now)
  // Period 1 pays half; period 2 pays the balancing half (assuming period 1
  // was paid in full). We can't observe what was actually paid, so this is
  // a "what to set aside" guide rather than a SARS submission.
  const nextPaymentAmount = estimatedAnnualTax / 2

  return {
    taxYear,
    taxYearStart: start,
    taxYearEnd: end,
    daysIntoYear,
    daysInYear,
    ytdProfit,
    annualisedProfit,
    estimatedAnnualTax,
    nextDeadline,
    nextPeriod,
    nextPaymentAmount,
  }
}
