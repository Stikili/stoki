import { SupabaseClient } from '@supabase/supabase-js'
import { IAirtimePinRepository } from '@/domain/repositories/IAirtimePinRepository'
import { AirtimePin, NewAirtimePin } from '@/domain/entities/airtime-pin'
import { toAirtimePin } from '../mappers'

export class AirtimePinRepository implements IAirtimePinRepository {
  constructor(private db: SupabaseClient) {}

  async bulkInsert(storeId: string, productId: string, pins: NewAirtimePin[]): Promise<number> {
    if (pins.length === 0) return 0
    const rows = pins.map((p) => ({
      store_id: storeId,
      product_id: productId,
      pin: p.pin,
      serial: p.serial ?? null,
      expires_at: p.expiresAt ?? null,
    }))
    const { data, error } = await this.db
      .from('airtime_pins')
      .insert(rows)
      .select('id')
    if (error) throw new Error(error.message)
    return (data ?? []).length
  }

  async countAvailable(storeId: string, productId: string, now: Date = new Date()): Promise<number> {
    const nowIso = now.toISOString()
    const { count, error } = await this.db
      .from('airtime_pins')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('product_id', productId)
      .is('sold_at', null)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    if (error) throw new Error(error.message)
    return count ?? 0
  }

  async dispense(storeId: string, productId: string, saleId: string, now: Date = new Date()): Promise<AirtimePin | null> {
    const nowIso = now.toISOString()
    // Optimistic concurrency: claim the oldest unsold PIN by adding a
    // sold_at = null predicate to the UPDATE. If two cashiers race for the
    // same PIN, one of them will see no row updated and we retry once.
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: candidate, error: selErr } = await this.db
        .from('airtime_pins')
        .select('id')
        .eq('store_id', storeId)
        .eq('product_id', productId)
        .is('sold_at', null)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (selErr) throw new Error(selErr.message)
      if (!candidate) return null

      const { data: updated, error: updErr } = await this.db
        .from('airtime_pins')
        .update({ sold_at: nowIso, sold_in_sale_id: saleId })
        .eq('id', candidate.id)
        .is('sold_at', null) // race-protect
        .select()
        .maybeSingle()
      if (updErr) throw new Error(updErr.message)
      if (updated) return toAirtimePin(updated)
      // Lost the race — try again.
    }
    return null
  }

  async findSold(storeId: string, productId: string, limit = 50): Promise<AirtimePin[]> {
    const { data, error } = await this.db
      .from('airtime_pins')
      .select('*')
      .eq('store_id', storeId)
      .eq('product_id', productId)
      .not('sold_at', 'is', null)
      .order('sold_at', { ascending: false })
      .limit(limit)
    if (error) throw new Error(error.message)
    return (data ?? []).map(toAirtimePin)
  }
}
