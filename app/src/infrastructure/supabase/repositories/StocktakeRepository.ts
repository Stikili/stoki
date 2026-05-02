import { SupabaseClient } from '@supabase/supabase-js'
import { IStocktakeRepository } from '@/domain/repositories/IStocktakeRepository'
import { Stocktake, NewStocktake } from '@/domain/entities/stocktake'
import { toStocktake } from '../mappers'

export class StocktakeRepository implements IStocktakeRepository {
  constructor(private db: SupabaseClient) {}

  async create(storeId: string, performedBy: string | null, data: NewStocktake): Promise<Stocktake> {
    const { data: header, error: headerError } = await this.db
      .from('stocktakes')
      .insert({
        store_id: storeId,
        performed_by: performedBy,
        notes: data.notes ?? null,
      })
      .select()
      .single()

    if (headerError || !header) {
      throw new Error(headerError?.message ?? 'Failed to create stocktake')
    }

    const lineRows = data.lines.map((l) => ({
      stocktake_id: header.id,
      store_id: storeId,
      product_id: l.productId,
      system_qty: l.systemQty,
      counted_qty: l.countedQty,
      variance: l.countedQty - l.systemQty,
      cost_per_unit: l.costPerUnit,
    }))

    const { data: insertedLines, error: linesError } = await this.db
      .from('stocktake_lines')
      .insert(lineRows)
      .select('*, products(name)')

    if (linesError) {
      // Best-effort cleanup so we don't leave a header without lines.
      await this.db.from('stocktakes').delete().eq('id', header.id)
      throw new Error(linesError.message)
    }

    return toStocktake({ ...header, lines: insertedLines ?? [] })
  }

  async findRecent(storeId: string, limit = 20): Promise<Stocktake[]> {
    const { data, error } = await this.db
      .from('stocktakes')
      .select('*, lines:stocktake_lines(*, products(name))')
      .eq('store_id', storeId)
      .order('performed_at', { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message)
    return (data ?? []).map(toStocktake)
  }
}
