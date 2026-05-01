export interface Restock {
  id: string
  storeId: string
  productId: string | null
  productName: string | null
  qtyAdded: number
  cost: number | null
  supplierId: string | null
  supplierName: string | null
  notes: string | null
  recordedAt: string
  createdAt: string
}

export interface NewRestock {
  productId: string
  qtyAdded: number
  cost?: number
  supplierId?: string
  notes?: string
  recordedAt?: string
}
