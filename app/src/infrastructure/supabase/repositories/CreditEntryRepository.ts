import { SupabaseClient } from '@supabase/supabase-js'
import { ICreditEntryRepository } from '@/domain/repositories/ICreditEntryRepository'
import { CreditEntry, NewCreditEntry } from '@/domain/entities/credit-entry'
import { toCreditEntry } from '../mappers'

export class CreditEntryRepository implements ICreditEntryRepository {
  constructor(private db: SupabaseClient) {}

  async findByDebtor(storeId: string, debtorId: string): Promise<CreditEntry[]> {
    const { data, error } = await this.db
      .from('credit_entries')
      .select('*')
      .eq('store_id', storeId)
      .eq('debtor_id', debtorId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data ?? []).map(toCreditEntry)
  }

  async create(storeId: string, data: NewCreditEntry): Promise<CreditEntry> {
    const { data: row, error } = await this.db
      .from('credit_entries')
      .insert({
        store_id: storeId,
        debtor_id: data.debtorId,
        amount: data.amount,
        description: data.description ?? null,
        items_json: data.items ?? null,
      })
      .select()
      .single()

    if (error || !row) throw new Error(error?.message ?? 'Failed to create credit entry')
    return toCreditEntry(row)
  }

  async settle(storeId: string, entryId: string): Promise<void> {
    const { error } = await this.db
      .from('credit_entries')
      .update({ settled_at: new Date().toISOString() })
      .eq('store_id', storeId)
      .eq('id', entryId)

    if (error) throw new Error(error.message)
  }
}
