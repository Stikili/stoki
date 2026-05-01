import { SupabaseClient } from '@supabase/supabase-js'
import { IRestockRepository } from '@/domain/repositories/IRestockRepository'
import { Restock, NewRestock } from '@/domain/entities/restock'
import { toRestock } from '../mappers'

export class RestockRepository implements IRestockRepository {
  constructor(private db: SupabaseClient) {}

  async record(storeId: string, data: NewRestock): Promise<Restock> {
    const { data: row, error } = await this.db
      .from('restocks')
      .insert({
        store_id: storeId,
        product_id: data.productId,
        qty_added: data.qtyAdded,
        cost: data.cost ?? null,
        supplier_id: data.supplierId ?? null,
        notes: data.notes ?? null,
        recorded_at: data.recordedAt ?? new Date().toISOString(),
      })
      .select('*, products(name), suppliers(name)')
      .single()

    if (error || !row) throw new Error(error?.message ?? 'Failed to record restock')
    return toRestock(row)
  }

  async findByPeriod(storeId: string, from: Date, to: Date): Promise<Restock[]> {
    const { data, error } = await this.db
      .from('restocks')
      .select('*, products(name), suppliers(name)')
      .eq('store_id', storeId)
      .gte('recorded_at', from.toISOString())
      .lte('recorded_at', to.toISOString())
      .order('recorded_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data ?? []).map(toRestock)
  }

  async findByProduct(storeId: string, productId: string, limit = 20): Promise<Restock[]> {
    const { data, error } = await this.db
      .from('restocks')
      .select('*, products(name), suppliers(name)')
      .eq('store_id', storeId)
      .eq('product_id', productId)
      .order('recorded_at', { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message)
    return (data ?? []).map(toRestock)
  }
}
