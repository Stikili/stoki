/**
 * SA payroll calculator — given an employee's monthly gross, returns the
 * monthly PAYE, UIF (employee + employer) and SDL portions.
 *
 *   PAYE = annual brackets applied to (gross × 12), less primary rebate,
 *          divided back by 12. (We don't gross up to taxable for benefits
 *          in v1 — base salary IS the taxable amount.)
 *
 *   UIF  = 1 % employee + 1 % employer on remuneration capped at the SARS
 *          ceiling (R17 712 / month for 2026). Both sides paid over by employer.
 *
 *   SDL  = 1 % of payroll. Only payable when annual payroll exceeds the
 *          SARS threshold (R500 000). Employer-only. The calculator returns
 *          per-employee SDL as gross × 0.01, BUT the caller is responsible
 *          for zeroing it out if the store's annual payroll falls below
 *          threshold (see paySheetForRun).
 *
 * Brackets and rebate live in lib/tax/sa-brackets.ts — single source of
 * truth for SARS personal income tax across the app (also used by the
 * provisional-tax estimator).
 */

import {
  PERSONAL_BRACKETS_2026,
  PRIMARY_REBATE_2026,
} from '@/lib/tax/sa-brackets'
import { taxFromBrackets } from '@/lib/tax/provisional'

export const UIF_CEILING_MONTHLY = 17_712
export const UIF_RATE = 0.01
export const SDL_RATE = 0.01
export const SDL_ANNUAL_THRESHOLD = 500_000

export interface PayslipMath {
  gross: number
  paye: number
  uifEmployee: number
  uifEmployer: number
  sdl: number
  net: number
}

/** Pure — monthly PAYE on a given monthly gross. Zero below the threshold. */
export function monthlyPaye(monthlyGross: number): number {
  if (monthlyGross <= 0) return 0
  const annualGross = monthlyGross * 12
  const annualTax = Math.max(0, taxFromBrackets(annualGross, PERSONAL_BRACKETS_2026) - PRIMARY_REBATE_2026)
  return annualTax / 12
}

/** Pure — monthly UIF per side (employer + employee each pay this much). */
export function monthlyUifOneSide(monthlyGross: number): number {
  if (monthlyGross <= 0) return 0
  return Math.min(monthlyGross, UIF_CEILING_MONTHLY) * UIF_RATE
}

/** Pure — monthly SDL (employer-only). 1 % of gross. Caller must zero out
 *  when the store's annual payroll is under threshold. */
export function monthlySdl(monthlyGross: number): number {
  if (monthlyGross <= 0) return 0
  return monthlyGross * SDL_RATE
}

/** Build a full per-employee payslip for one period. Pure. */
export function buildPayslip(
  monthlyGross: number,
  uifEnrolled: boolean,
  sdlLiable: boolean,
): PayslipMath {
  const paye = monthlyPaye(monthlyGross)
  const uifSide = uifEnrolled ? monthlyUifOneSide(monthlyGross) : 0
  const sdl = sdlLiable ? monthlySdl(monthlyGross) : 0
  const net = monthlyGross - paye - uifSide

  return {
    gross: monthlyGross,
    paye,
    uifEmployee: uifSide,
    uifEmployer: uifSide,
    sdl,
    net,
  }
}

/** SDL liability is store-wide: triggered if total annual payroll exceeds
 *  the SARS threshold. Pure — caller passes the annual figure. */
export function isSdlLiable(annualPayroll: number): boolean {
  return annualPayroll > SDL_ANNUAL_THRESHOLD
}
