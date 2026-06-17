/**
 * Fixed asset — capital purchase (fridge, vehicle, till, furniture) that
 * depreciates over a useful life rather than being expensed at purchase.
 *
 * Straight-line only in v1:
 *   monthly_charge = (cost − residual) / useful_life_months
 *   book_value(t)  = cost − monthly_charge × months_elapsed
 *                    (clamped at residual)
 */

export type AssetStatus = 'active' | 'disposed' | 'fully_depreciated'

export type AssetCategory =
  | 'vehicle'
  | 'equipment'
  | 'furniture'
  | 'computer'
  | 'fridge'
  | 'other'

export const ASSET_CATEGORIES: { value: AssetCategory; label: string; defaultLifeMonths: number }[] = [
  { value: 'vehicle',   label: 'Vehicle',                 defaultLifeMonths: 60 },
  { value: 'fridge',    label: 'Fridge / cold-room',      defaultLifeMonths: 60 },
  { value: 'equipment', label: 'Equipment (till, scale)', defaultLifeMonths: 60 },
  { value: 'furniture', label: 'Furniture / shelving',    defaultLifeMonths: 72 },
  { value: 'computer',  label: 'Computer / tablet',       defaultLifeMonths: 36 },
  { value: 'other',     label: 'Other',                   defaultLifeMonths: 60 },
]

export interface FixedAsset {
  id: string
  storeId: string
  name: string
  category: AssetCategory
  cost: number
  residualValue: number
  usefulLifeMonths: number
  purchaseDate: string
  status: AssetStatus
  disposedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface NewFixedAsset {
  name: string
  category: AssetCategory
  cost: number
  residualValue?: number
  usefulLifeMonths: number
  purchaseDate: string
  notes?: string
}

export interface DepreciationEntry {
  id: string
  assetId: string
  storeId: string
  periodOf: string
  amount: number
  createdAt: string
}

/** Pure — monthly straight-line charge. */
export function monthlyDepreciation(asset: Pick<FixedAsset, 'cost' | 'residualValue' | 'usefulLifeMonths'>): number {
  const base = Math.max(0, asset.cost - asset.residualValue)
  return base / asset.usefulLifeMonths
}

/** Pure — how many whole calendar months from purchase to `asOf`. */
export function monthsElapsed(purchaseDate: Date, asOf: Date): number {
  const years = asOf.getFullYear() - purchaseDate.getFullYear()
  const months = asOf.getMonth() - purchaseDate.getMonth()
  return Math.max(0, years * 12 + months)
}

/** Pure — book value at `asOf`, clamped at residual. */
export function bookValue(asset: FixedAsset, asOf: Date): number {
  const months = monthsElapsed(new Date(asset.purchaseDate), asOf)
  const charged = Math.min(
    monthlyDepreciation(asset) * months,
    Math.max(0, asset.cost - asset.residualValue),
  )
  return asset.cost - charged
}

/** Pure — return the last day of the month for the given date. */
export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}
