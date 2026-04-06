export interface CreditEntry {
  id: string
  storeId: string
  debtorId: string
  amount: number
  itemsJson: { productId: string; name: string; qty: number; price: number }[] | null
  settledAt: string | null
  createdAt: string
}

export interface NewCreditEntry {
  debtorId: string
  amount: number
  items?: { productId: string; name: string; qty: number; price: number }[]
}
