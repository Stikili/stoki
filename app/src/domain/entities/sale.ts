export type SaleChannel = 'app' | 'whatsapp' | 'ussd'

export type SaleType = 'sale' | 'return'

export interface Sale {
  id: string
  storeId: string
  productId: string | null
  productName: string | null
  qty: number
  priceAtSale: number
  costAtSale: number
  type: SaleType
  channel: SaleChannel
  recordedAt: string
  createdAt: string
}

export interface NewSale {
  productId: string
  qty: number
  priceAtSale: number
  costAtSale?: number
  type?: SaleType
  channel?: SaleChannel
}

export interface SalesSummary {
  totalRevenue: number
  totalCost: number
  totalMargin: number
  transactionCount: number
  itemsSold: number
}
