/**
 * Supplier bill — an unpaid liability the store owes to a supplier. The
 * payables-side mirror of the customer-side Invoice.
 *
 * Aging is derived in app code from `dueAt` minus now(); the schema only
 * stores the dates and totals. See agingBucket() / agingTotals() below.
 */

export interface SupplierBill {
  id: string
  storeId: string
  supplierId: string
  supplierName: string | null
  reference: string | null
  issuedAt: string
  dueAt: string
  total: number
  amountPaid: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface NewSupplierBill {
  supplierId: string
  reference?: string
  issuedAt?: string
  dueAt: string
  total: number
  notes?: string
}

export interface SupplierBillPayment {
  id: string
  billId: string
  storeId: string
  amount: number
  paidAt: string
  paymentMethod: string
  notes: string | null
  createdAt: string
}

export type AgingBucket = 'current' | 'days30' | 'days60' | 'days90Plus'

export function balanceOf(bill: SupplierBill): number {
  return Math.max(0, bill.total - bill.amountPaid)
}

export function isOpen(bill: SupplierBill): boolean {
  return balanceOf(bill) > 0
}

export function isOverdue(bill: SupplierBill, now: Date = new Date()): boolean {
  return isOpen(bill) && new Date(bill.dueAt).getTime() < now.getTime()
}

/** Whole days a bill is past its due date (negative = not yet due). */
export function daysOverdue(bill: SupplierBill, now: Date = new Date()): number {
  const ms = now.getTime() - new Date(bill.dueAt).getTime()
  return Math.floor(ms / 86_400_000)
}

/**
 * SARS-style aging bucket. "current" covers anything not yet due plus the
 * first 30 days overdue (the working window most suppliers tolerate). The
 * higher buckets escalate from there — 31-60, 61-90, 90+.
 */
export function agingBucket(bill: SupplierBill, now: Date = new Date()): AgingBucket {
  const days = daysOverdue(bill, now)
  if (days <= 30) return 'current'
  if (days <= 60) return 'days30'
  if (days <= 90) return 'days60'
  return 'days90Plus'
}

export interface AgingTotals {
  current: number
  days30: number
  days60: number
  days90Plus: number
  total: number
  /** Open-bill count by bucket — used for "3 bills 60+ days overdue" copy. */
  countByBucket: Record<AgingBucket, number>
}

/** Reduce a list of bills into bucket totals. Only open balances are counted. */
export function agingTotals(
  bills: SupplierBill[],
  now: Date = new Date(),
): AgingTotals {
  const out: AgingTotals = {
    current: 0, days30: 0, days60: 0, days90Plus: 0, total: 0,
    countByBucket: { current: 0, days30: 0, days60: 0, days90Plus: 0 },
  }
  for (const b of bills) {
    const bal = balanceOf(b)
    if (bal <= 0) continue
    const bucket = agingBucket(b, now)
    out[bucket] += bal
    out.total += bal
    out.countByBucket[bucket] += 1
  }
  return out
}
