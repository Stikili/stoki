/**
 * SARS VAT201 worksheet — breaks period sales and purchases into the blocks
 * SARS' submission form expects. The earlier /reports VAT tab gave a single
 * net-due figure; this module gives the per-block numbers a VAT-registered
 * trader actually types into eFiling.
 *
 * Scope:
 *   - Output VAT split by tax code (block 1 standard / 2 zero / 3 exempt)
 *   - Input VAT split by capital vs operating (block 14 / 15)
 *   - Bad-debt write-off as an input claim (block 18) — manual figure
 *
 * Not yet covered (deliberate v1 cut):
 *   - Block 4A / 12 adjustments
 *   - Change-in-use
 *   - Bad debts *recovered* (block 11)
 *
 * All inputs are values you already have on the period:
 *   sales[]    — already filtered to the VAT period
 *   restocks[] — assumed VAT-inclusive supplier cost (SA wholesale default)
 *   expenses[] — capital vs operating split by `is_capital` flag
 *   badDebtWriteOff — owner-entered amount of receivables they wrote off this period
 */

import type { Sale } from '@/domain/entities/sale'
import type { Restock } from '@/domain/entities/restock'
import type { Expense } from '@/domain/entities/expense'

export interface Vat201Inputs {
  sales: Sale[]
  restocks: Restock[]
  expenses: Expense[]
  /** Bad debt written off this period, gross (VAT-inclusive). Owner-entered. */
  badDebtWriteOff?: number
  /** Store's VAT rate as a decimal (0.15 for 15%). */
  vatRate: number
}

export interface Vat201Breakdown {
  // Output side (block 4 = output VAT on standard sales)
  block1_standardSalesIncl: number
  block2_zeroRatedSales: number
  block3_exemptSales: number
  block4_outputVat: number

  // Input side
  block14_capitalInputVat: number
  block15_otherInputVat: number
  block18_badDebtInputVat: number

  // Totals
  totalOutputVat: number
  totalInputVat: number
  /** Positive = owed to SARS, negative = refundable. */
  netVatDue: number
}

/**
 * VAT-fraction extraction from a tax-inclusive figure.
 * VAT-inclusive 115 × 15/115 = 15 (the VAT portion).
 */
export function vatFraction(grossIncl: number, vatRate: number): number {
  if (grossIncl <= 0 || vatRate <= 0) return 0
  return (grossIncl * vatRate) / (1 + vatRate)
}

export function computeVat201(input: Vat201Inputs): Vat201Breakdown {
  const { sales, restocks, expenses, vatRate } = input
  const badDebtWriteOff = input.badDebtWriteOff ?? 0

  let block1 = 0
  let block2 = 0
  let block3 = 0
  let block4 = 0

  // Output side: bucket sales by code. Returns subtract.
  for (const s of sales) {
    const sign = s.type === 'return' ? -1 : 1
    const gross = s.priceAtSale * s.qty * sign
    // Legacy rows recorded before classification existed are treated as standard.
    const code = s.vatCode ?? 'standard'
    if (code === 'zero') {
      block2 += gross
    } else if (code === 'exempt') {
      block3 += gross
    } else {
      block1 += gross
      block4 += s.vatAmount * sign
    }
  }

  // Input side — restocks (operating goods bought for resale) assume the
  // supplier was VAT-registered (SA wholesale norm). The 15/115 fraction
  // pulls the VAT portion out of the inclusive cost.
  const restocksInputVat = restocks.reduce((sum, r) => {
    if (!r.cost) return sum
    return sum + vatFraction(r.cost * r.qtyAdded, vatRate)
  }, 0)

  let capitalExpenseInputVat = 0
  let operatingExpenseInputVat = 0
  for (const e of expenses) {
    const portion = vatFraction(e.amount, vatRate)
    if (e.isCapital) capitalExpenseInputVat += portion
    else operatingExpenseInputVat += portion
  }

  const block14 = capitalExpenseInputVat
  const block15 = restocksInputVat + operatingExpenseInputVat
  const block18 = vatFraction(badDebtWriteOff, vatRate)

  const totalOutputVat = block4
  const totalInputVat = block14 + block15 + block18
  const netVatDue = totalOutputVat - totalInputVat

  return {
    block1_standardSalesIncl: block1,
    block2_zeroRatedSales:    block2,
    block3_exemptSales:       block3,
    block4_outputVat:         block4,
    block14_capitalInputVat:  block14,
    block15_otherInputVat:    block15,
    block18_badDebtInputVat:  block18,
    totalOutputVat,
    totalInputVat,
    netVatDue,
  }
}
