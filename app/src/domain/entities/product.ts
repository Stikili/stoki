export type StockStatus = 'ok' | 'low' | 'out'

export interface Product {
  id: string
  storeId: string
  name: string
  price: number
  cost: number
  qty: number
  reorderPoint: number
  sku: string | null
  photoUrl: string | null
  expiryDate: string | null
  vatInclusive: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductWithStatus extends Product {
  status: StockStatus
  margin: number
  marginPct: number
}

export interface NewProduct {
  name: string
  price: number
  cost: number
  qty: number
  reorderPoint: number
  sku?: string
  expiryDate?: string
  vatInclusive?: boolean
}

export function getStockStatus(qty: number, reorderPoint: number): StockStatus {
  if (qty <= 0) return 'out'
  if (qty <= reorderPoint) return 'low'
  return 'ok'
}

export function withStatus(product: Product): ProductWithStatus {
  const margin = product.price - product.cost
  const marginPct = product.price > 0 ? (margin / product.price) * 100 : 0
  return {
    ...product,
    status: getStockStatus(product.qty, product.reorderPoint),
    margin,
    marginPct,
  }
}

/**
 * Whole days from `now` until expiry. Negative once expired.
 * Returns `null` when the product has no expiry date set.
 */
export function daysUntilExpiry(product: Pick<Product, 'expiryDate'>, now: Date = new Date()): number | null {
  if (!product.expiryDate) return null
  const expiry = new Date(product.expiryDate)
  const ms = expiry.getTime() - now.getTime()
  return Math.ceil(ms / 86_400_000)
}

/**
 * "Expiring soon" = within `withinDays` days, or already expired.
 * Returns false when the product has no expiry date.
 */
export function isExpiringSoon(product: Pick<Product, 'expiryDate'>, withinDays = 7, now: Date = new Date()): boolean {
  const days = daysUntilExpiry(product, now)
  if (days === null) return false
  return days <= withinDays
}
