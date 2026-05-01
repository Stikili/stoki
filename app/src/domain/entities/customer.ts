// Formal B2B customer — distinct from `Debtor` which is informal trade credit
// captured at the till. Customers have payment terms and receive proper
// numbered tax invoices.
export interface Customer {
  id: string
  storeId: string
  name: string
  contactName: string | null
  email: string | null
  phone: string | null
  vatNumber: string | null
  billingAddress: string | null
  paymentTermsDays: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface NewCustomer {
  name: string
  contactName?: string
  email?: string
  phone?: string
  vatNumber?: string
  billingAddress?: string
  paymentTermsDays?: number
  notes?: string
}
