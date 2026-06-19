/**
 * Purchase order — tracks what's been ordered from a supplier and what's been
 * received against it. Stock movement is NOT side-effected; the owner uses
 * the existing restock flow on /inventory after delivery. Receiving here just
 * marks how much of the order has actually shown up so late deliveries
 * surface and over-/under-shipments are visible.
 */

export type POStatus = 'draft' | 'sent' | 'partial' | 'received' | 'cancelled'

export interface PurchaseOrderLine {
  id: string
  poId: string
  storeId: string
  productId: string | null
  productName: string | null
  description: string
  qtyOrdered: number
  qtyReceived: number
  unitCost: number
  createdAt: string
}

export interface PurchaseOrder {
  id: string
  storeId: string
  supplierId: string
  supplierName: string | null
  poNumber: number
  expectedAt: string | null
  status: POStatus
  notes: string | null
  lines: PurchaseOrderLine[]
  createdAt: string
  updatedAt: string
}

export interface NewPurchaseOrderLine {
  productId?: string | null
  description: string
  qtyOrdered: number
  unitCost: number
}

export interface NewPurchaseOrder {
  supplierId: string
  expectedAt?: string
  notes?: string
  lines: NewPurchaseOrderLine[]
}

export function lineTotal(line: Pick<PurchaseOrderLine, 'qtyOrdered' | 'unitCost'>): number {
  return line.qtyOrdered * line.unitCost
}

export function orderTotal(po: Pick<PurchaseOrder, 'lines'>): number {
  return po.lines.reduce((sum, l) => sum + lineTotal(l), 0)
}

export function receivedTotal(po: Pick<PurchaseOrder, 'lines'>): number {
  return po.lines.reduce((sum, l) => sum + l.qtyReceived * l.unitCost, 0)
}

export function outstandingTotal(po: Pick<PurchaseOrder, 'lines'>): number {
  return po.lines.reduce((sum, l) => sum + Math.max(0, l.qtyOrdered - l.qtyReceived) * l.unitCost, 0)
}

/** Derive the status field based on cumulative receipt across lines. */
export function deriveStatus(po: Pick<PurchaseOrder, 'lines' | 'status'>): POStatus {
  if (po.status === 'cancelled' || po.status === 'draft') return po.status
  const allReceived = po.lines.every((l) => l.qtyReceived >= l.qtyOrdered)
  if (allReceived) return 'received'
  const anyReceived = po.lines.some((l) => l.qtyReceived > 0)
  if (anyReceived) return 'partial'
  return 'sent'
}

export function isOverdue(po: Pick<PurchaseOrder, 'expectedAt' | 'status'>, now: Date = new Date()): boolean {
  if (po.status === 'received' || po.status === 'cancelled') return false
  if (!po.expectedAt) return false
  return new Date(po.expectedAt).getTime() < now.getTime()
}
