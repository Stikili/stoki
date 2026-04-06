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
        qty: data.qty,
        price_at_sale: data.priceAtSale,
        channel: data.channel ?? 'app',
      })
      .select('*, products(name)')
      .single()

    if (error || !row) throw new Error(error?.message ?? 'Failed to record sale')
    return toSale(row)
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
      (acc, sale) => ({
        totalRevenue: acc.totalRevenue + sale.priceAtSale * sale.qty,
        totalCost: acc.totalCost,
        totalMargin: acc.totalMargin,
        transactionCount: acc.transactionCount + 1,
        itemsSold: acc.itemsSold + sale.qty,
      }),
      { totalRevenue: 0, totalCost: 0, totalMargin: 0, transactionCount: 0, itemsSold: 0 }
    )
  }
}
