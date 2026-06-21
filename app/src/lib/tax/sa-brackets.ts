/**
 * SARS tax tables — 2026 tax year (year ending 28 Feb 2026).
 *
 * Used by the provisional-tax estimator AND the payroll PAYE calculator
 * (lib/payroll/calculator.ts). Single source of truth — when SARS publishes
 * new brackets after a Budget, edit this file and every dependent surface
 * recomputes.
 *
 * BRACKETS_LAST_VERIFIED is the tax year these tables were checked against.
 * `bracketsAreStale(now)` returns true once the calendar passes the end of
 * that tax year so the UI can warn the owner the numbers may be out of
 * date. When you update the figures, bump LAST_VERIFIED to the new year.
 */

import type { TaxpayerType } from '@/domain/entities/store'

/** Most recent SA tax year these tables were checked against the SARS
 *  published rates for. Bump when you update bracket values. */
export const BRACKETS_LAST_VERIFIED = 2026

/** True once the working year has passed the verified year — i.e. the
 *  brackets are at least one Budget cycle stale and may be wrong. */
export function bracketsAreStale(now: Date = new Date()): boolean {
  // SA tax year ending Y runs 1 Mar (Y-1) → 28/29 Feb (Y).
  // Months 0-1 (Jan, Feb) still belong to tax year Y; Mar+ to Y+1.
  const currentTaxYear = now.getMonth() <= 1 ? now.getFullYear() : now.getFullYear() + 1
  return currentTaxYear > BRACKETS_LAST_VERIFIED
}

export interface Bracket {
  /** Inclusive upper bound of this bracket; null for the open top bracket. */
  upTo: number | null
  /** Tax owed at the floor of this bracket (cumulative from earlier brackets). */
  baseTax: number
  /** Marginal rate applied to income above the bracket floor (0–1). */
  rate: number
  /** Bracket floor — income above this amount is taxed at `rate`. */
  threshold: number
}

/** Personal income tax — applied to sole-prop net profit. */
export const PERSONAL_BRACKETS_2026: Bracket[] = [
  { threshold:        0, upTo:   237_100, baseTax:        0, rate: 0.18 },
  { threshold:  237_100, upTo:   370_500, baseTax:   42_678, rate: 0.26 },
  { threshold:  370_500, upTo:   512_800, baseTax:   77_362, rate: 0.31 },
  { threshold:  512_800, upTo:   673_000, baseTax:  121_475, rate: 0.36 },
  { threshold:  673_000, upTo:   857_900, baseTax:  179_147, rate: 0.39 },
  { threshold:  857_900, upTo: 1_817_000, baseTax:  251_258, rate: 0.41 },
  { threshold: 1_817_000, upTo:      null, baseTax:  644_489, rate: 0.45 },
]

/** Small Business Corporation (SBC) graduated rates. */
export const SBC_BRACKETS_2026: Bracket[] = [
  { threshold:        0, upTo:    95_750, baseTax:        0, rate: 0    },
  { threshold:   95_750, upTo:   365_000, baseTax:        0, rate: 0.07 },
  { threshold:  365_000, upTo:   550_000, baseTax:   18_848, rate: 0.21 },
  { threshold:  550_000, upTo:      null, baseTax:   57_698, rate: 0.27 },
]

/** Turnover Tax for registered micro businesses (T/O ≤ R1m). */
export const TURNOVER_BRACKETS_2026: Bracket[] = [
  { threshold:        0, upTo:   335_000, baseTax:    0,    rate: 0    },
  { threshold:  335_000, upTo:   500_000, baseTax:    0,    rate: 0.01 },
  { threshold:  500_000, upTo:   750_000, baseTax: 1_650,   rate: 0.02 },
  { threshold:  750_000, upTo: 1_000_000, baseTax: 6_650,   rate: 0.03 },
]

/** Flat corporate-tax rate for standard companies. */
export const COMPANY_RATE_2026 = 0.27

/** Tax rebates (personal income tax). Apply to sole-prop only. */
export const PRIMARY_REBATE_2026 = 17_235   // all individuals
export const SECONDARY_REBATE_2026 = 9_444  // 65+
export const TERTIARY_REBATE_2026 = 3_145   // 75+

/** Pick the right bracket table for a taxpayer type. Returns null for company
 *  (flat rate — caller branches). */
export function bracketsFor(type: TaxpayerType): Bracket[] | null {
  switch (type) {
    case 'sole_prop':    return PERSONAL_BRACKETS_2026
    case 'sbc':          return SBC_BRACKETS_2026
    case 'turnover_tax': return TURNOVER_BRACKETS_2026
    case 'company':      return null
  }
}
