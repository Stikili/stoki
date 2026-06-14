import { SupabaseClient } from '@supabase/supabase-js'
import {
  SupplierBill, NewSupplierBill, SupplierBillPayment,
} from '@/domain/entities/supplier-bill'
import { toSupplierBill, toSupplierBillPayment } from '../mappers'

/**
 * Payables-side mirror of InvoiceRepository. Bills are joined to suppliers
 * to surface supplier name in the list view without a second query.
 */
export class SupplierBillRepository {
  constructor(private db: SupabaseClient) {}

  async findAll(storeId: string): Promise<SupplierBill[]> {
    const { data, error } = await this.db
      .from('supplier_bills')
      .select('*, suppliers(name)')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .order('due_at', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []).map(toSupplierBill)
  }

  async findOpen(storeId: string): Promise<SupplierBill[]> {
    // "Open" = balance > 0. We filter in JS rather than via a generated column
    // so the index stays a partial-index (deleted_at IS NULL AND amount_paid <
    // total, defined in migration 025). Small N, negligible cost.
    const all = await this.findAll(storeId)
    return all.filter((b) => b.amountPaid < b.total)
  }

  async findById(storeId: string, id: string): Promise<SupplierBill | null> {
    const { data, error } = await this.db
      .from('supplier_bills')
      .select('*, suppliers(name)')
      .eq('store_id', storeId)
      .eq('id', id)
      .is('deleted_at', null)
      .single()
    if (error || !data) return null
    return toSupplierBill(data)
  }

  async create(storeId: string, data: NewSupplierBill): Promise<SupplierBill> {
    const { data: row, error } = await this.db
      .from('supplier_bills')
      .insert({
        store_id: storeId,
        supplier_id: data.supplierId,
        reference: data.reference ?? null,
        issued_at: data.issuedAt ?? new Date().toISOString(),
        due_at: data.dueAt,
        total: data.total,
        notes: data.notes ?? null,
      })
      .select('*, suppliers(name)')
      .single()
    if (error || !row) throw new Error(error?.message ?? 'Failed to create supplier bill')
    return toSupplierBill(row)
  }

  async archive(storeId: string, id: string): Promise<void> {
    const { error } = await this.db
      .from('supplier_bills')
      .update({ deleted_at: new Date().toISOString() })
      .eq('store_id', storeId)
      .eq('id', id)
    if (error) throw new Error(error.message)
  }

  async findPaymentsForBill(billId: string): Promise<SupplierBillPayment[]> {
    const { data, error } = await this.db
      .from('supplier_bill_payments')
      .select('*')
      .eq('bill_id', billId)
      .order('paid_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(toSupplierBillPayment)
  }

  async recordPayment(
    storeId: string,
    billId: string,
    amount: number,
    paymentMethod: string,
    notes?: string,
  ): Promise<SupplierBillPayment> {
    // Insert the payment row first, then bump amount_paid on the parent bill.
    // The bump is a follow-up read-update so we keep the running total in
    // sync without a DB trigger (simpler, single-writer assumption matches
    // every other money flow in the app).
    const { data: payRow, error: payErr } = await this.db
      .from('supplier_bill_payments')
      .insert({
        bill_id: billId,
        store_id: storeId,
        amount,
        payment_method: paymentMethod,
        notes: notes ?? null,
      })
      .select()
      .single()
    if (payErr || !payRow) throw new Error(payErr?.message ?? 'Failed to record payment')

    const { data: billRow, error: billErr } = await this.db
      .from('supplier_bills')
      .select('amount_paid')
      .eq('store_id', storeId)
      .eq('id', billId)
      .single()
    if (billErr || !billRow) throw new Error(billErr?.message ?? 'Bill not found')

    const newAmountPaid = Number(billRow.amount_paid) + amount
    const { error: updErr } = await this.db
      .from('supplier_bills')
      .update({ amount_paid: newAmountPaid })
      .eq('store_id', storeId)
      .eq('id', billId)
    if (updErr) throw new Error(updErr.message)

    return toSupplierBillPayment(payRow)
  }
}
