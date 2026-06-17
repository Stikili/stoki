import { SupabaseClient } from '@supabase/supabase-js'
import {
  FixedAsset, NewFixedAsset, DepreciationEntry,
} from '@/domain/entities/fixed-asset'
import { toFixedAsset, toDepreciationEntry } from '../mappers'

export class FixedAssetRepository {
  constructor(private db: SupabaseClient) {}

  async findAll(storeId: string): Promise<FixedAsset[]> {
    const { data, error } = await this.db
      .from('fixed_assets')
      .select('*')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .order('purchase_date', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(toFixedAsset)
  }

  async findActive(storeId: string): Promise<FixedAsset[]> {
    const { data, error } = await this.db
      .from('fixed_assets')
      .select('*')
      .eq('store_id', storeId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('purchase_date', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(toFixedAsset)
  }

  async create(storeId: string, data: NewFixedAsset): Promise<FixedAsset> {
    const { data: row, error } = await this.db
      .from('fixed_assets')
      .insert({
        store_id: storeId,
        name: data.name,
        category: data.category,
        cost: data.cost,
        residual_value: data.residualValue ?? 0,
        useful_life_months: data.usefulLifeMonths,
        purchase_date: data.purchaseDate,
        notes: data.notes ?? null,
      })
      .select()
      .single()
    if (error || !row) throw new Error(error?.message ?? 'Failed to create asset')
    return toFixedAsset(row)
  }

  async updateStatus(
    storeId: string, id: string,
    status: 'active' | 'disposed' | 'fully_depreciated',
    disposedAt?: string,
  ): Promise<void> {
    const patch: Record<string, unknown> = { status }
    if (disposedAt !== undefined) patch.disposed_at = disposedAt
    const { error } = await this.db
      .from('fixed_assets')
      .update(patch)
      .eq('store_id', storeId)
      .eq('id', id)
    if (error) throw new Error(error.message)
  }

  async archive(storeId: string, id: string): Promise<void> {
    const { error } = await this.db
      .from('fixed_assets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('store_id', storeId)
      .eq('id', id)
    if (error) throw new Error(error.message)
  }

  // Depreciation entries -------------------------------------------------

  async findEntriesByPeriod(storeId: string, from: Date, to: Date): Promise<DepreciationEntry[]> {
    const { data, error } = await this.db
      .from('depreciation_entries')
      .select('*')
      .eq('store_id', storeId)
      .gte('period_of', from.toISOString().slice(0, 10))
      .lte('period_of', to.toISOString().slice(0, 10))
      .order('period_of', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(toDepreciationEntry)
  }

  async sumByPeriod(storeId: string, from: Date, to: Date): Promise<number> {
    const entries = await this.findEntriesByPeriod(storeId, from, to)
    return entries.reduce((s, e) => s + e.amount, 0)
  }

  /** Insert a single (asset, period) row. Unique constraint blocks dupes. */
  async insertEntry(
    storeId: string, assetId: string, periodOf: string, amount: number,
  ): Promise<{ inserted: boolean }> {
    const { error } = await this.db
      .from('depreciation_entries')
      .insert({
        asset_id: assetId,
        store_id: storeId,
        period_of: periodOf,
        amount,
      })
    if (error) {
      // PG 23505 = unique violation — already posted this period, idempotent no-op.
      if (error.code === '23505') return { inserted: false }
      throw new Error(error.message)
    }
    return { inserted: true }
  }

  async accumulatedForAsset(storeId: string, assetId: string): Promise<number> {
    const { data, error } = await this.db
      .from('depreciation_entries')
      .select('amount')
      .eq('store_id', storeId)
      .eq('asset_id', assetId)
    if (error) throw new Error(error.message)
    return (data ?? []).reduce((s, r) => s + Number(r.amount), 0)
  }
}
