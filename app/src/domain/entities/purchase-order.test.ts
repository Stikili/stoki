import { describe, it, expect } from 'vitest'
import {
  lineTotal, orderTotal, receivedTotal, outstandingTotal, deriveStatus, isOverdue,
  type PurchaseOrder, type PurchaseOrderLine,
} from './purchase-order'

function line(o: Partial<PurchaseOrderLine> = {}): PurchaseOrderLine {
  return {
    id: 'l', poId: 'p', storeId: 's',
    productId: null, productName: null,
    description: 'X', qtyOrdered: 10, qtyReceived: 0,
    unitCost: 5, createdAt: '',
    ...o,
  }
}

function po(lines: PurchaseOrderLine[], o: Partial<PurchaseOrder> = {}): PurchaseOrder {
  return {
    id: 'p', storeId: 's', supplierId: 'sup', supplierName: 'Sup',
    poNumber: 1, expectedAt: null, status: 'sent', notes: null,
    lines, createdAt: '', updatedAt: '',
    ...o,
  }
}

describe('line + order totals', () => {
  it('lineTotal multiplies qty × unit cost', () => {
    expect(lineTotal({ qtyOrdered: 10, unitCost: 5 })).toBe(50)
  })

  it('orderTotal sums every line', () => {
    expect(orderTotal({ lines: [
      line({ qtyOrdered: 10, unitCost: 5 }),  // 50
      line({ qtyOrdered: 3, unitCost: 20 }),  // 60
    ] })).toBe(110)
  })

  it('receivedTotal uses qtyReceived', () => {
    expect(receivedTotal({ lines: [
      line({ qtyOrdered: 10, qtyReceived: 4, unitCost: 5 }),   // 20
      line({ qtyOrdered: 3, qtyReceived: 3, unitCost: 20 }),   // 60
    ] })).toBe(80)
  })

  it('outstandingTotal floors at zero per line (over-receipts don\'t go negative)', () => {
    expect(outstandingTotal({ lines: [
      line({ qtyOrdered: 10, qtyReceived: 4, unitCost: 5 }),   // 30
      line({ qtyOrdered: 3, qtyReceived: 5, unitCost: 20 }),   // 0 (over-received)
    ] })).toBe(30)
  })
})

describe('deriveStatus', () => {
  it('keeps draft as draft', () => {
    expect(deriveStatus(po([line({ qtyOrdered: 5, qtyReceived: 5 })], { status: 'draft' }))).toBe('draft')
  })

  it('keeps cancelled as cancelled', () => {
    expect(deriveStatus(po([line({ qtyOrdered: 5, qtyReceived: 0 })], { status: 'cancelled' }))).toBe('cancelled')
  })

  it('all lines fully received → received', () => {
    expect(deriveStatus(po([
      line({ qtyOrdered: 5, qtyReceived: 5 }),
      line({ qtyOrdered: 3, qtyReceived: 3 }),
    ], { status: 'sent' }))).toBe('received')
  })

  it('any line partially received → partial', () => {
    expect(deriveStatus(po([
      line({ qtyOrdered: 5, qtyReceived: 2 }),
      line({ qtyOrdered: 3, qtyReceived: 0 }),
    ], { status: 'sent' }))).toBe('partial')
  })

  it('nothing received → sent', () => {
    expect(deriveStatus(po([line({ qtyOrdered: 5, qtyReceived: 0 })], { status: 'sent' }))).toBe('sent')
  })
})

describe('isOverdue', () => {
  it('open PO past expected_at is overdue', () => {
    expect(isOverdue({ expectedAt: '2026-06-01T00:00:00Z', status: 'sent' }, new Date('2026-06-15T00:00:00Z'))).toBe(true)
  })

  it('received PO never overdue', () => {
    expect(isOverdue({ expectedAt: '2026-06-01T00:00:00Z', status: 'received' }, new Date('2026-06-15T00:00:00Z'))).toBe(false)
  })

  it('cancelled PO never overdue', () => {
    expect(isOverdue({ expectedAt: '2026-06-01T00:00:00Z', status: 'cancelled' }, new Date('2026-06-15T00:00:00Z'))).toBe(false)
  })

  it('no expected date → not overdue', () => {
    expect(isOverdue({ expectedAt: null, status: 'sent' }, new Date('2026-06-15T00:00:00Z'))).toBe(false)
  })
})
