import type { SupabaseClient } from '@supabase/supabase-js'
import {
  MarketIndicator,
  MarketIndicatorKind,
  NewMarketIndicator,
} from '@/domain/entities/market-indicator'

/**
 * Latest-row-per-kind reader and append-only writer for market_indicators.
 * Keeps history (every refresh inserts a new row) so we can later compute
 * "rate up 25bps month-on-month" trends without backfilling.
 */
export class MarketIndicatorRepository {
  constructor(private db: SupabaseClient) {}

  /** Latest value for each kind in `kinds` (or all known kinds when omitted). */
  async findLatest(kinds?: MarketIndicatorKind[]): Promise<Partial<Record<MarketIndicatorKind, MarketIndicator>>> {
    // PostgREST doesn't expose DISTINCT ON, so we pull recent rows ordered by
    // kind + fetched_at DESC and pick the head per kind in JS. The composite
    // index keeps this fast; we only ever care about the last row per kind.
    let query = this.db
      .from('market_indicators')
      .select('*')
      .order('fetched_at', { ascending: false })

    if (kinds && kinds.length > 0) {
      query = query.in('kind', kinds)
    }

    // Cap defensively — even in the worst case there are 7 kinds.
    const { data, error } = await query.limit(200)
    if (error) throw new Error(error.message)

    const out: Partial<Record<MarketIndicatorKind, MarketIndicator>> = {}
    for (const row of data ?? []) {
      const k = row.kind as MarketIndicatorKind
      if (!out[k]) out[k] = toMarketIndicator(row)
    }
    return out
  }

  /** Insert a fresh snapshot row. Call sites that update many indicators
   *  should batch via `bulkUpsert` to avoid N round-trips. */
  async insert(data: NewMarketIndicator): Promise<MarketIndicator> {
    const { data: row, error } = await this.db
      .from('market_indicators')
      .insert({
        kind: data.kind,
        value: data.value,
        source: data.source,
        measured_at: data.measuredAt ?? null,
        notes: data.notes ?? null,
      })
      .select()
      .single()
    if (error || !row) throw new Error(error?.message ?? 'Failed to insert market indicator')
    return toMarketIndicator(row)
  }

  async bulkInsert(rows: NewMarketIndicator[]): Promise<number> {
    if (rows.length === 0) return 0
    const { data, error } = await this.db
      .from('market_indicators')
      .insert(rows.map((r) => ({
        kind: r.kind,
        value: r.value,
        source: r.source,
        measured_at: r.measuredAt ?? null,
        notes: r.notes ?? null,
      })))
      .select('id')
    if (error) throw new Error(error.message)
    return (data ?? []).length
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toMarketIndicator(row: any): MarketIndicator {
  return {
    id: row.id,
    kind: row.kind,
    value: Number(row.value),
    source: row.source,
    measuredAt: row.measured_at ?? null,
    fetchedAt: row.fetched_at,
    notes: row.notes ?? null,
  }
}
