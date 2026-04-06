import { SupabaseClient } from '@supabase/supabase-js'
import { IDebtorRepository } from '@/domain/repositories/IDebtorRepository'
import { Debtor, NewDebtor } from '@/domain/entities/debtor'
import { toDebtor } from '../mappers'

export class DebtorRepository implements IDebtorRepository {
  constructor(private db: SupabaseClient) {}

  async findAll(storeId: string): Promise<Debtor[]> {
    const { data, error } = await this.db
      .from('debtors')
      .select('*')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .order('total_owed', { ascending: false })

    if (error) throw new Error(error.message)
    return (data ?? []).map(toDebtor)
  }

  async findById(storeId: string, debtorId: string): Promise<Debtor | null> {
    const { data, error } = await this.db
      .from('debtors')
      .select('*')
      .eq('store_id', storeId)
      .eq('id', debtorId)
      .is('deleted_at', null)
      .single()

    if (error || !data) return null
    return toDebtor(data)
  }

  async create(storeId: string, data: NewDebtor): Promise<Debtor> {
    const { data: row, error } = await this.db
      .from('debtors')
      .insert({ store_id: storeId, name: data.name, phone: data.phone ?? null })
      .select()
      .single()

    if (error || !row) throw new Error(error?.message ?? 'Failed to create debtor')
    return toDebtor(row)
  }

  async updateOwed(storeId: string, debtorId: string, delta: number): Promise<void> {
    const { error } = await this.db.rpc('increment_debtor_owed', {
      p_store_id: storeId,
      p_debtor_id: debtorId,
      p_delta: delta,
    })
    if (error) throw new Error(error.message)
  }

  async markReminded(storeId: string, debtorId: string): Promise<void> {
    const { error } = await this.db
      .from('debtors')
      .update({ last_reminded_at: new Date().toISOString() })
      .eq('store_id', storeId)
      .eq('id', debtorId)

    if (error) throw new Error(error.message)
  }

  async archive(storeId: string, debtorId: string): Promise<void> {
    const { error } = await this.db
      .from('debtors')
      .update({ deleted_at: new Date().toISOString() })
      .eq('store_id', storeId)
      .eq('id', debtorId)

    if (error) throw new Error(error.message)
  }
}
