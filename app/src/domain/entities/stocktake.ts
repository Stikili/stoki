export interface StocktakeLine {
  id: string
  productId: string | null
  productName: string | null
  systemQty: number
  countedQty: number
  variance: number
  costPerUnit: number
}

export interface Stocktake {
  id: string
  storeId: string
  performedBy: string | null
  performedAt: string
  notes: string | null
  createdAt: string
  lines: StocktakeLine[]
}

export interface NewStocktakeLine {
  productId: string
  systemQty: number
  countedQty: number
  costPerUnit: number
}

export interface NewStocktake {
  notes?: string
  lines: NewStocktakeLine[]
}

/** Variance value at cost: positive = found stock gain, negative = shrinkage loss. */
export function lineVarianceValue(line: Pick<StocktakeLine, 'variance' | 'costPerUnit'>): number {
  return line.variance * line.costPerUnit
}

export function totalVarianceValue(lines: Pick<StocktakeLine, 'variance' | 'costPerUnit'>[]): number {
  return lines.reduce((sum, l) => sum + lineVarianceValue(l), 0)
}

/** Lines that actually changed inventory — useful for "did this stocktake find anything?". */
export function nonZeroVarianceLines<T extends { variance: number }>(lines: T[]): T[] {
  return lines.filter((l) => l.variance !== 0)
}
