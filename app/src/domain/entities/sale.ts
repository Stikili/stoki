export type SaleChannel = 'app' | 'whatsapp' | 'ussd'

export interface Sale {
  id: string
  storeId: string
  productId: string | null
  productName: string | null
  qty: number
  priceAtSale: number
  channel: SaleChannel
  recordedAt: string
  createdAt: string
}

export interface NewSale {
  productId: string
  qty: number
  priceAtSale: number
  channel?: SaleChannel
}

export interface SalesSummary {
  totalRevenue: number
  totalCost: number
  totalMargin: number
  transactionCount: number
  itemsSold: number
}
