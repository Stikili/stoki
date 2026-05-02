export type SaleChannel = 'app' | 'whatsapp' | 'ussd'

export type SaleType = 'sale' | 'return'

export type PaymentMethod = 'cash' | 'card' | 'snapscan' | 'yoco' | 'eft' | 'ewallet' | 'credit'

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'snapscan', label: 'SnapScan' },
  { value: 'yoco', label: 'Yoco' },
  { value: 'eft', label: 'EFT' },
  { value: 'ewallet', label: 'eWallet' },
  { value: 'credit', label: 'On credit' },
]

export interface Sale {
  id: string
  storeId: string
  productId: string | null
  productName: string | null
  qty: number
  priceAtSale: number
  costAtSale: number
  vatAmount: number
  invoiceNumber: number | null
  type: SaleType
  channel: SaleChannel
  paymentMethod: PaymentMethod
  recordedAt: string
  createdAt: string
}

export interface NewSale {
  productId: string
  qty: number
  priceAtSale: number
  costAtSale?: number
  vatAmount?: number
  invoiceNumber?: number | null
  type?: SaleType
  channel?: SaleChannel
  paymentMethod?: PaymentMethod
}

export interface SalesSummary {
  totalRevenue: number
  totalCost: number
  totalMargin: number
  totalVat: number
  transactionCount: number
  itemsSold: number
}
