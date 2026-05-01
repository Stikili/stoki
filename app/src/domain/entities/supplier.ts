export interface Supplier {
  id: string
  storeId: string
  name: string
  contactName: string | null
  phone: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface NewSupplier {
  name: string
  contactName?: string
  phone?: string
  notes?: string
}
