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
