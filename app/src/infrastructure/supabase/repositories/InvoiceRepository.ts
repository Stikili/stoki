import { SupabaseClient } from '@supabase/supabase-js'
import { IInvoiceRepository } from '@/domain/repositories/IInvoiceRepository'
import { Invoice, NewInvoice, InvoiceStatus, InvoicePayment } from '@/domain/entities/invoice'
import { toInvoice, toInvoicePayment } from '../mappers'

export class InvoiceRepository implements IInvoiceRepository {
  constructor(private db: SupabaseClient) {}

  async findAll(storeId: string): Promise<Invoice[]> {
    const { data, error } = await this.db
      .from('invoices')
      .select('*, customers(name)')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .order('issued_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(toInvoice)
  }

  async findOpen(storeId: string): Promise<Invoice[]> {
    const { data, error } = await this.db
      .from('invoices')
      .select('*, customers(name)')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .in('status', ['draft', 'sent'])
      .order('due_at', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []).map(toInvoice)
  }

  async findById(storeId: string, id: string): Promise<Invoice | null> {
    const { data, error } = await this.db
      .from('invoices')
      .select('*, customers(name)')
      .eq('store_id', storeId)
      .eq('id', id)
      .is('deleted_at', null)
      .single()
    if (error || !data) return null
    return toInvoice(data)
  }

  async create(
    storeId: string,
    data: NewInvoice & { invoiceNumber: number; subtotalExcl: number; vatAmount: number; total: number },
  ): Promise<Invoice> {
    const { data: row, error } = await this.db
      .from('invoices')
      .insert({
        store_id: storeId,
        customer_id: data.customerId,
        invoice_number: data.invoiceNumber,
        status: data.status ?? 'draft',
        due_at: data.dueAt,
        line_items: data.lineItems.map(i => ({
          description: i.description,
          qty: i.qty,
          unit_price: i.unitPrice,
          vat_amount: i.vatAmount,
          vat_inclusive: i.vatInclusive,
          product_id: i.productId ?? null,
        })),
        subtotal_excl: data.subtotalExcl,
        vat_amount: data.vatAmount,
        total: data.total,
        notes: data.notes ?? null,
      })
      .select('*, customers(name)')
      .single()
    if (error || !row) throw new Error(error?.message ?? 'Failed to create invoice')
    return toInvoice(row)
  }

  async updateStatus(storeId: string, id: string, status: InvoiceStatus): Promise<void> {
    const { error } = await this.db
      .from('invoices')
      .update({ status })
      .eq('store_id', storeId)
      .eq('id', id)
    if (error) throw new Error(error.message)
  }

  async archive(storeId: string, id: string): Promise<void> {
    const { error } = await this.db
      .from('invoices')
      .update({ deleted_at: new Date().toISOString() })
      .eq('store_id', storeId)
      .eq('id', id)
    if (error) throw new Error(error.message)
  }

  async recordPayment(
    storeId: string,
    invoiceId: string,
    amount: number,
    paymentMethod: string,
    notes?: string,
  ): Promise<InvoicePayment> {
    // Insert the payment row.
    const { data: payRow, error: payErr } = await this.db
      .from('invoice_payments')
      .insert({
        invoice_id: invoiceId,
        store_id: storeId,
        amount,
        payment_method: paymentMethod,
        notes: notes ?? null,
      })
      .select()
      .single()
    if (payErr || !payRow) throw new Error(payErr?.message ?? 'Failed to record payment')

    // Bump amount_paid + flip status if fully paid. Read-modify-write — for B2B
    // payment cadence the contention is non-existent.
    const invoice = await this.findById(storeId, invoiceId)
    if (invoice) {
      const newPaid = invoice.amountPaid + amount
      const newStatus: InvoiceStatus = newPaid >= invoice.total - 0.01 ? 'paid' : invoice.status
      await this.db
        .from('invoices')
        .update({ amount_paid: newPaid, status: newStatus })
        .eq('store_id', storeId)
        .eq('id', invoiceId)
    }

    return toInvoicePayment(payRow)
  }

  async findPayments(storeId: string, invoiceId: string): Promise<InvoicePayment[]> {
    const { data, error } = await this.db
      .from('invoice_payments')
      .select('*')
      .eq('store_id', storeId)
      .eq('invoice_id', invoiceId)
      .order('paid_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(toInvoicePayment)
  }
}
