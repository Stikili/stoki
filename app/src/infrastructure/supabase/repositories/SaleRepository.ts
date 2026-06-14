import { SupabaseClient } from '@supabase/supabase-js'
import { ISaleRepository } from '@/domain/repositories/ISaleRepository'
import { Sale, NewSale, SalesSummary } from '@/domain/entities/sale'
import { toSale } from '../mappers'

export class SaleRepository implements ISaleRepository {
  constructor(private db: SupabaseClient) {}

  async record(storeId: string, data: NewSale): Promise<Sale> {
    const { data: row, error } = await this.db
      .from('sales')
      .insert({
        store_id: storeId,
        product_id: data.productId,
        // Free-text name only persists when there's no product_id to link to —
        // otherwise leave NULL so the products(name) join stays the source of truth.
        product_name: data.productId ? null : (data.productName ?? null),
        qty: data.qty,
        price_at_sale: data.priceAtSale,
        cost_at_sale: data.costAtSale ?? 0,
        vat_amount: data.vatAmount ?? 0,
        vat_code: data.vatCode ?? null,
        invoice_number: data.invoiceNumber ?? null,
        type: data.type ?? 'sale',
        channel: data.channel ?? 'app',
        payment_method: data.paymentMethod ?? 'cash',
      })
      .select('*, products(name)')
      .single()

    if (error || !row) throw new Error(error?.message ?? 'Failed to record sale')
    return toSale(row)
  }

  async claimInvoiceNumber(storeId: string): Promise<number> {
    const { data, error } = await this.db.rpc('claim_next_invoice_no', { p_store_id: storeId })
    if (error) throw new Error(error.message)
    return Number(data)
  }

  async findById(storeId: string, saleId: string): Promise<Sale | null> {
    const { data, error } = await this.db
      .from('sales')
      .select('*, products(name)')
      .eq('store_id', storeId)
      .eq('id', saleId)
      .single()
    if (error || !data) return null
    return toSale(data)
  }

  async findByPeriod(storeId: string, from: Date, to: Date): Promise<Sale[]> {
    const { data, error } = await this.db
      .from('sales')
      .select('*, products(name)')
      .eq('store_id', storeId)
      .gte('recorded_at', from.toISOString())
      .lte('recorded_at', to.toISOString())
      .order('recorded_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data ?? []).map(toSale)
  }

  async summarise(storeId: string, from: Date, to: Date): Promise<SalesSummary> {
    const sales = await this.findByPeriod(storeId, from, to)
    return sales.reduce<SalesSummary>(
      (acc, sale) => {
        const sign = sale.type === 'return' ? -1 : 1
        const revenue = sale.priceAtSale * sale.qty * sign
        const cost = sale.costAtSale * sale.qty * sign
        const vat = sale.vatAmount * sign
        return {
          totalRevenue: acc.totalRevenue + revenue,
          totalCost: acc.totalCost + cost,
          totalMargin: acc.totalMargin + (revenue - cost),
          totalVat: acc.totalVat + vat,
          transactionCount: acc.transactionCount + 1,
          itemsSold: acc.itemsSold + sale.qty * sign,
        }
      },
      { totalRevenue: 0, totalCost: 0, totalMargin: 0, totalVat: 0, transactionCount: 0, itemsSold: 0 }
    )
  }
}
