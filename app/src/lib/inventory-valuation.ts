/**
 * Inventory valuation — "how much cash is tied up in stock right now?".
 *
 * For each product:
 *   costValue   = cost × qty   (capital tied up)
 *   retailValue = price × qty  (cash if it sells through at current prices)
 *   marginValue = retailValue − costValue
 *
 * Bundles are skipped in the totals (their value already shows up in the
 * component products' rows; counting both double-books). They still appear
 * in the line list so the owner can see the assortment, but their costValue
 * is excluded from the totals.
 *
 * Out-of-stock products contribute zero everywhere and are excluded from
 * the line list to keep the table readable.
 *
 * Pure — no DB, no Date.now(). Caller passes the product list.
 */

import type { Product } from '@/domain/entities/product'

export interface ValuationLine {
  productId: string
  productName: string
  qty: number
  cost: number
  price: number
  costValue: number
  retailValue: number
  marginValue: number
  marginPct: number
  isWeighable: boolean
  unitLabel: string
  isBundle: boolean
  isAirtime: boolean
}

export interface InventoryValuation {
  totalCostValue: number
  totalRetailValue: number
  totalPotentialMargin: number
  totalPotentialMarginPct: number
  /** Products with qty > 0 contributing to totals (bundles excluded). */
  countedProductCount: number
  /** Products with qty = 0 (ignored — no cash tied up). */
  outOfStockCount: number
  /** Bundles, present in `lines` for visibility but not in totals. */
  excludedBundleCount: number
  /** Sorted by costValue desc — biggest capital sinks first. */
  lines: ValuationLine[]
}

export function computeValuation(products: Product[]): InventoryValuation {
  let totalCostValue = 0
  let totalRetailValue = 0
  let countedProductCount = 0
  let outOfStockCount = 0
  let excludedBundleCount = 0

  const lines: ValuationLine[] = []
  for (const p of products) {
    if (p.qty <= 0) { outOfStockCount++; continue }

    const costValue = p.cost * p.qty
    const retailValue = p.price * p.qty
    const marginValue = retailValue - costValue
    const marginPct = retailValue > 0 ? (marginValue / retailValue) * 100 : 0

    lines.push({
      productId: p.id,
      productName: p.name,
      qty: p.qty,
      cost: p.cost,
      price: p.price,
      costValue,
      retailValue,
      marginValue,
      marginPct,
      isWeighable: p.isWeighable,
      unitLabel: p.unitLabel,
      isBundle: p.isBundle,
      isAirtime: p.isAirtime,
    })

    if (p.isBundle) {
      excludedBundleCount++
      continue
    }

    totalCostValue += costValue
    totalRetailValue += retailValue
    countedProductCount++
  }

  lines.sort((a, b) => b.costValue - a.costValue)

  const totalPotentialMargin = totalRetailValue - totalCostValue
  const totalPotentialMarginPct = totalRetailValue > 0
    ? (totalPotentialMargin / totalRetailValue) * 100
    : 0

  return {
    totalCostValue,
    totalRetailValue,
    totalPotentialMargin,
    totalPotentialMarginPct,
    countedProductCount,
    outOfStockCount,
    excludedBundleCount,
    lines,
  }
}
