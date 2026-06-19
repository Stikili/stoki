import { SupabaseClient } from '@supabase/supabase-js'
import {
  PurchaseOrder, NewPurchaseOrder, POStatus, deriveStatus,
} from '@/domain/entities/purchase-order'
import { toPurchaseOrder } from '../mappers'

export class PurchaseOrderRepository {
  constructor(private db: SupabaseClient) {}

  async findAll(storeId: string): Promise<PurchaseOrder[]> {
    const { data, error } = await this.db
      .from('purchase_orders')
      .select('*, suppliers(name), purchase_order_lines(*, products(name))')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .order('po_number', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(toPurchaseOrder)
  }

  async findOpen(storeId: string): Promise<PurchaseOrder[]> {
    const { data, error } = await this.db
      .from('purchase_orders')
      .select('*, suppliers(name), purchase_order_lines(*, products(name))')
      .eq('store_id', storeId)
      .in('status', ['draft', 'sent', 'partial'])
      .is('deleted_at', null)
      .order('expected_at', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []).map(toPurchaseOrder)
  }

  async findById(storeId: string, id: string): Promise<PurchaseOrder | null> {
    const { data, error } = await this.db
      .from('purchase_orders')
      .select('*, suppliers(name), purchase_order_lines(*, products(name))')
      .eq('store_id', storeId)
      .eq('id', id)
      .is('deleted_at', null)
      .single()
    if (error || !data) return null
    return toPurchaseOrder(data)
  }

  async claimPoNumber(storeId: string): Promise<number> {
    const { data, error } = await this.db.rpc('claim_next_po_no', { p_store_id: storeId })
    if (error) throw new Error(error.message)
    return Number(data)
  }

  async create(
    storeId: string, data: NewPurchaseOrder,
  ): Promise<PurchaseOrder> {
    const poNumber = await this.claimPoNumber(storeId)
    const { data: poRow, error: poErr } = await this.db
      .from('purchase_orders')
      .insert({
        store_id: storeId,
        supplier_id: data.supplierId,
        po_number: poNumber,
        expected_at: data.expectedAt ?? null,
        status: 'sent',
        notes: data.notes ?? null,
      })
      .select()
      .single()
    if (poErr || !poRow) throw new Error(poErr?.message ?? 'Failed to create PO')

    if (data.lines.length > 0) {
      const { error: lineErr } = await this.db
        .from('purchase_order_lines')
        .insert(data.lines.map((l) => ({
          po_id: poRow.id,
          store_id: storeId,
          product_id: l.productId ?? null,
          description: l.description,
          qty_ordered: l.qtyOrdered,
          unit_cost: l.unitCost,
        })))
      if (lineErr) throw new Error(lineErr.message)
    }

    const fresh = await this.findById(storeId, poRow.id)
    if (!fresh) throw new Error('Failed to reload PO')
    return fresh
  }

  async receiveLine(
    storeId: string, lineId: string, qtyReceived: number,
  ): Promise<void> {
    const { error } = await this.db
      .from('purchase_order_lines')
      .update({ qty_received: qtyReceived })
      .eq('store_id', storeId)
      .eq('id', lineId)
    if (error) throw new Error(error.message)
  }

  /** Recompute and persist status from the current line totals. */
  async refreshStatus(storeId: string, poId: string): Promise<POStatus> {
    const po = await this.findById(storeId, poId)
    if (!po) throw new Error('PO not found')
    const status = deriveStatus(po)
    if (status !== po.status) {
      const { error } = await this.db
        .from('purchase_orders')
        .update({ status })
        .eq('store_id', storeId)
        .eq('id', poId)
      if (error) throw new Error(error.message)
    }
    return status
  }

  async setStatus(storeId: string, poId: string, status: POStatus): Promise<void> {
    const { error } = await this.db
      .from('purchase_orders')
      .update({ status })
      .eq('store_id', storeId)
      .eq('id', poId)
    if (error) throw new Error(error.message)
  }

  async archive(storeId: string, poId: string): Promise<void> {
    const { error } = await this.db
      .from('purchase_orders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('store_id', storeId)
      .eq('id', poId)
    if (error) throw new Error(error.message)
  }
}
