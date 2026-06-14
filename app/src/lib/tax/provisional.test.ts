import { describe, it, expect } from 'vitest'
import {
  currentTaxYear,
  taxYearStart,
  taxYearEnd,
  nextProvisionalDeadline,
  taxFromBrackets,
  estimateIncomeTax,
  estimateProvisional,
} from './provisional'
import {
  PERSONAL_BRACKETS_2026,
  SBC_BRACKETS_2026,
  TURNOVER_BRACKETS_2026,
} from './sa-brackets'

describe('currentTaxYear', () => {
  it('returns the year ending Feb 28 when the date is in March-Dec', () => {
    expect(currentTaxYear(new Date(2026, 2, 1))).toBe(2027)   // 1 Mar 2026 → TY 2027
    expect(currentTaxYear(new Date(2026, 5, 14))).toBe(2027)  // 14 Jun 2026 → TY 2027
    expect(currentTaxYear(new Date(2026, 11, 31))).toBe(2027) // 31 Dec 2026 → TY 2027
  })

  it('returns the same calendar year when the date is in Jan-Feb', () => {
    expect(currentTaxYear(new Date(2027, 0, 15))).toBe(2027)
    expect(currentTaxYear(new Date(2027, 1, 28))).toBe(2027)
  })
})

describe('taxYearStart / taxYearEnd', () => {
  it('starts on 1 March of the previous calendar year', () => {
    const start = taxYearStart(2027)
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(2) // March
    expect(start.getDate()).toBe(1)
  })

  it('ends on the last day of February (handles leap years)', () => {
    expect(taxYearEnd(2027).getDate()).toBe(28) // 2027 not a leap year
    expect(taxYearEnd(2028).getDate()).toBe(29) // 2028 IS a leap year
  })
})

describe('nextProvisionalDeadline', () => {
  it('points at end-Feb when the date is in Jan-Feb', () => {
    const d = nextProvisionalDeadline(new Date(2027, 0, 15))
    expect(d.period).toBe(2)
    expect(d.date.getFullYear()).toBe(2027)
    expect(d.date.getMonth()).toBe(1)
    expect(d.date.getDate()).toBe(28)
  })

  it('points at end-Aug for Mar-Aug dates', () => {
    const d = nextProvisionalDeadline(new Date(2026, 5, 14))
    expect(d.period).toBe(1)
    expect(d.date.getMonth()).toBe(7) // August
    expect(d.date.getDate()).toBe(31)
  })

  it('points at next-year end-Feb for Sep-Dec dates', () => {
    const d = nextProvisionalDeadline(new Date(2026, 10, 1)) // Nov 2026
    expect(d.period).toBe(2)
    expect(d.date.getFullYear()).toBe(2027)
    expect(d.date.getMonth()).toBe(1)
  })
})

describe('taxFromBrackets — personal income', () => {
  it('returns 0 for zero or negative taxable income', () => {
    expect(taxFromBrackets(0, PERSONAL_BRACKETS_2026)).toBe(0)
    expect(taxFromBrackets(-1000, PERSONAL_BRACKETS_2026)).toBe(0)
  })

  it('taxes income in the first bracket at 18%', () => {
    expect(taxFromBrackets(100_000, PERSONAL_BRACKETS_2026)).toBeCloseTo(18_000, 2)
  })

  it('matches SARS at the R237 100 bracket top', () => {
    // Bracket 1 ceiling: 237,100 × 18% = 42,678
    expect(taxFromBrackets(237_100, PERSONAL_BRACKETS_2026)).toBeCloseTo(42_678, 2)
  })

  it('handles the second bracket — R300 000 = 42 678 + (300 000 − 237 100) × 26%', () => {
    const expected = 42_678 + (300_000 - 237_100) * 0.26
    expect(taxFromBrackets(300_000, PERSONAL_BRACKETS_2026)).toBeCloseTo(expected, 2)
  })

  it('handles the top bracket', () => {
    const expected = 644_489 + (2_000_000 - 1_817_000) * 0.45
    expect(taxFromBrackets(2_000_000, PERSONAL_BRACKETS_2026)).toBeCloseTo(expected, 2)
  })
})

describe('estimateIncomeTax — sole prop (rebates applied)', () => {
  it('returns 0 below the tax threshold (rebate absorbs the bracket)', () => {
    // R95 750 × 18% = R17 235 = primary rebate → owe 0
    expect(estimateIncomeTax(95_750, 'sole_prop')).toBeCloseTo(0, 2)
  })

  it('starts taxing above the threshold', () => {
    const tax = estimateIncomeTax(100_000, 'sole_prop')
    expect(tax).toBeGreaterThan(0)
    expect(tax).toBeCloseTo(100_000 * 0.18 - 17_235, 2)
  })

  it('applies the 65+ rebate', () => {
    const young = estimateIncomeTax(200_000, 'sole_prop', 40)
    const old   = estimateIncomeTax(200_000, 'sole_prop', 67)
    expect(young - old).toBeCloseTo(9_444, 2)
  })

  it('applies the 75+ rebate on top of the 65+ rebate', () => {
    const sixty = estimateIncomeTax(200_000, 'sole_prop', 60)
    const eighty = estimateIncomeTax(200_000, 'sole_prop', 80)
    expect(sixty - eighty).toBeCloseTo(9_444 + 3_145, 2)
  })
})

describe('estimateIncomeTax — SBC', () => {
  it('charges nothing on the first R95 750', () => {
    expect(estimateIncomeTax(95_750, 'sbc')).toBe(0)
  })

  it('charges 7% on the next slice', () => {
    expect(estimateIncomeTax(200_000, 'sbc')).toBeCloseTo((200_000 - 95_750) * 0.07, 2)
  })

  it('uses the second-bracket base + rate on R400k', () => {
    expect(estimateIncomeTax(400_000, 'sbc')).toBeCloseTo(18_848 + (400_000 - 365_000) * 0.21, 2)
  })
})

describe('estimateIncomeTax — turnover tax', () => {
  it('zero below R335 000', () => {
    expect(estimateIncomeTax(300_000, 'turnover_tax')).toBe(0)
  })

  it('1% on the R335k–R500k slice', () => {
    expect(estimateIncomeTax(400_000, 'turnover_tax')).toBeCloseTo((400_000 - 335_000) * 0.01, 2)
  })
})

describe('estimateIncomeTax — company', () => {
  it('flat 27%', () => {
    expect(estimateIncomeTax(500_000, 'company')).toBeCloseTo(135_000, 2)
  })
})

describe('estimateProvisional — end-to-end', () => {
  it('annualises straight-line and halves for period 1', () => {
    // 90 days into a 365-day year → annualise ×~4.06
    const start = new Date(2026, 2, 1) // 1 Mar 2026
    const now = new Date(start.getTime() + 90 * 86_400_000) // ~30 May 2026
    const est = estimateProvisional(50_000, 'sole_prop', now)

    expect(est.taxYear).toBe(2027)
    expect(est.daysIntoYear).toBe(90)
    expect(est.annualisedProfit).toBeCloseTo(50_000 * 365 / 90, 0)
    expect(est.nextPeriod).toBe(1)
    expect(est.nextPaymentAmount).toBeCloseTo(est.estimatedAnnualTax / 2, 2)
  })

  it('returns zero tax and zero payment for non-positive profit', () => {
    const est = estimateProvisional(-500, 'sole_prop', new Date(2026, 5, 14))
    expect(est.annualisedProfit).toBe(0)
    expect(est.estimatedAnnualTax).toBe(0)
    expect(est.nextPaymentAmount).toBe(0)
  })

  it('uses the right deadline for Sep-Dec dates (next year Feb-end)', () => {
    const est = estimateProvisional(100_000, 'sole_prop', new Date(2026, 10, 1))
    expect(est.nextPeriod).toBe(2)
    expect(est.nextDeadline.getFullYear()).toBe(2027)
    expect(est.nextDeadline.getMonth()).toBe(1) // February
  })

  it('SBC and sole_prop produce different bills for identical profit', () => {
    const now = new Date(2026, 5, 14)
    const sp  = estimateProvisional(120_000, 'sole_prop', now)
    const sbc = estimateProvisional(120_000, 'sbc', now)
    expect(sp.estimatedAnnualTax).not.toBe(sbc.estimatedAnnualTax)
  })
})

describe('sa-brackets — sanity', () => {
  it('SBC bracket 0 is genuinely zero-rated', () => {
    expect(SBC_BRACKETS_2026[0].rate).toBe(0)
  })

  it('turnover-tax bracket 0 is genuinely zero-rated', () => {
    expect(TURNOVER_BRACKETS_2026[0].rate).toBe(0)
  })
})
