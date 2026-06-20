import { describe, it, expect } from 'vitest'
import {
  monthlyPaye, monthlyUifOneSide, monthlySdl, buildPayslip, isSdlLiable,
  UIF_CEILING_MONTHLY, SDL_ANNUAL_THRESHOLD,
} from './calculator'
import { PRIMARY_REBATE_2026 } from '@/lib/tax/sa-brackets'

describe('monthlyPaye', () => {
  it('is zero at or below the rebate threshold (annual gross × 18% ≤ rebate)', () => {
    // R95 750 annual = R7 979 monthly. 95 750 × 18 % = 17 235 = rebate.
    expect(monthlyPaye(7_979)).toBe(0)
    expect(monthlyPaye(5_000)).toBe(0)
  })

  it('charges 18 % above threshold then nets the rebate, /12', () => {
    // R10 000/mo = R120 000 annual. Tax: 120 000 × 18 % = 21 600.
    // Less rebate 17 235 = R4 365 annual → R363.75/mo.
    expect(monthlyPaye(10_000)).toBeCloseTo((120_000 * 0.18 - 17_235) / 12, 2)
  })

  it('crosses into the 26 % bracket above R237 100 annual', () => {
    const monthly = 25_000 // 300k annual
    const expectedAnnual = 42_678 + (300_000 - 237_100) * 0.26 - PRIMARY_REBATE_2026
    expect(monthlyPaye(monthly)).toBeCloseTo(expectedAnnual / 12, 2)
  })

  it('zero on zero or negative gross', () => {
    expect(monthlyPaye(0)).toBe(0)
    expect(monthlyPaye(-500)).toBe(0)
  })
})

describe('monthlyUifOneSide', () => {
  it('charges 1 % below the ceiling', () => {
    expect(monthlyUifOneSide(10_000)).toBe(100)
  })

  it('caps at 1 % of the ceiling', () => {
    expect(monthlyUifOneSide(UIF_CEILING_MONTHLY)).toBeCloseTo(177.12, 2)
    expect(monthlyUifOneSide(25_000)).toBeCloseTo(177.12, 2)
  })

  it('zero on zero or negative gross', () => {
    expect(monthlyUifOneSide(0)).toBe(0)
    expect(monthlyUifOneSide(-500)).toBe(0)
  })
})

describe('monthlySdl', () => {
  it('is 1 % of gross — caller is responsible for store-level threshold gating', () => {
    expect(monthlySdl(10_000)).toBe(100)
    expect(monthlySdl(50_000)).toBe(500)
  })
})

describe('isSdlLiable', () => {
  it('false below the SARS threshold', () => {
    expect(isSdlLiable(SDL_ANNUAL_THRESHOLD)).toBe(false)
    expect(isSdlLiable(400_000)).toBe(false)
  })

  it('true above the threshold', () => {
    expect(isSdlLiable(SDL_ANNUAL_THRESHOLD + 1)).toBe(true)
    expect(isSdlLiable(750_000)).toBe(true)
  })
})

describe('buildPayslip', () => {
  it('UIF-opt-out employees pay no UIF on either side', () => {
    const slip = buildPayslip(10_000, false, false)
    expect(slip.uifEmployee).toBe(0)
    expect(slip.uifEmployer).toBe(0)
  })

  it('SDL-not-liable stores get zero SDL even on a real salary', () => {
    const slip = buildPayslip(10_000, true, false)
    expect(slip.sdl).toBe(0)
  })

  it('SDL-liable stores get 1 %', () => {
    const slip = buildPayslip(10_000, true, true)
    expect(slip.sdl).toBe(100)
  })

  it('net = gross − PAYE − employee UIF', () => {
    const slip = buildPayslip(10_000, true, true)
    expect(slip.net).toBeCloseTo(10_000 - slip.paye - slip.uifEmployee, 2)
  })

  it('SDL is employer-only — not netted off the employee', () => {
    const slipWithSdl    = buildPayslip(10_000, true, true)
    const slipWithoutSdl = buildPayslip(10_000, true, false)
    expect(slipWithSdl.net).toBe(slipWithoutSdl.net)
  })
})
