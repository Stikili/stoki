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
  /** null for manual / off-book sales where the cashier types in a one-off
   *  item that isn't in the inventory catalogue. */
  productId: string | null
  /** Free-text name. Only used when productId is null; otherwise the joined
   *  products.name on read wins. */
  productName?: string
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
