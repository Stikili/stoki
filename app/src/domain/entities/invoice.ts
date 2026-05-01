export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled'

export const INVOICE_STATUSES: { value: InvoiceStatus; label: string }[] = [
  { value: 'draft',     label: 'Draft' },
  { value: 'sent',      label: 'Sent' },
  { value: 'paid',      label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
]

export interface InvoiceLineItem {
  description: string
  qty: number
  unitPrice: number
  vatAmount: number
  vatInclusive: boolean
  productId?: string
}

export interface Invoice {
  id: string
  storeId: string
  customerId: string | null
  customerName: string | null
  invoiceNumber: number
  status: InvoiceStatus
  issuedAt: string
  dueAt: string
  lineItems: InvoiceLineItem[]
  subtotalExcl: number
  vatAmount: number
  total: number
  amountPaid: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface NewInvoice {
  customerId: string
  status?: InvoiceStatus
  dueAt: string
  lineItems: InvoiceLineItem[]
  notes?: string
}

export interface InvoicePayment {
  id: string
  invoiceId: string
  storeId: string
  amount: number
  paidAt: string
  paymentMethod: string
  notes: string | null
  createdAt: string
}

export function balanceOf(invoice: Invoice): number {
  return Math.max(0, invoice.total - invoice.amountPaid)
}

export function isOverdue(invoice: Invoice, now: Date = new Date()): boolean {
  if (invoice.status === 'paid' || invoice.status === 'cancelled') return false
  return new Date(invoice.dueAt).getTime() < now.getTime() && balanceOf(invoice) > 0
}

export function daysOverdue(invoice: Invoice, now: Date = new Date()): number {
  const ms = now.getTime() - new Date(invoice.dueAt).getTime()
  return Math.floor(ms / 86_400_000)
}
