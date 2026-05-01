import { SupabaseClient } from '@supabase/supabase-js'
import { IWastageRepository } from '@/domain/repositories/IWastageRepository'
import { Wastage, NewWastage } from '@/domain/entities/wastage'
import { toWastage } from '../mappers'

export class WastageRepository implements IWastageRepository {
  constructor(private db: SupabaseClient) {}

  async record(storeId: string, data: NewWastage & { costAtLoss: number }): Promise<Wastage> {
    const { data: row, error } = await this.db
      .from('wastage')
      .insert({
        store_id: storeId,
        product_id: data.productId,
        qty: data.qty,
        cost_at_loss: data.costAtLoss,
        reason: data.reason ?? 'other',
        notes: data.notes ?? null,
        recorded_at: data.recordedAt ?? new Date().toISOString(),
      })
      .select('*, products(name)')
      .single()
    if (error || !row) throw new Error(error?.message ?? 'Failed to record wastage')
    return toWastage(row)
  }

  async findByPeriod(storeId: string, from: Date, to: Date): Promise<Wastage[]> {
    const { data, error } = await this.db
      .from('wastage')
      .select('*, products(name)')
      .eq('store_id', storeId)
      .gte('recorded_at', from.toISOString())
      .lte('recorded_at', to.toISOString())
      .order('recorded_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(toWastage)
  }
}
