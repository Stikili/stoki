import { SupabaseClient } from '@supabase/supabase-js'
import { ISupplierRepository } from '@/domain/repositories/ISupplierRepository'
import { Supplier, NewSupplier } from '@/domain/entities/supplier'
import { toSupplier } from '../mappers'

export class SupplierRepository implements ISupplierRepository {
  constructor(private db: SupabaseClient) {}

  async findAll(storeId: string): Promise<Supplier[]> {
    const { data, error } = await this.db
      .from('suppliers')
      .select('*')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .order('name')

    if (error) throw new Error(error.message)
    return (data ?? []).map(toSupplier)
  }

  async findById(storeId: string, supplierId: string): Promise<Supplier | null> {
    const { data, error } = await this.db
      .from('suppliers')
      .select('*')
      .eq('store_id', storeId)
      .eq('id', supplierId)
      .is('deleted_at', null)
      .single()

    if (error || !data) return null
    return toSupplier(data)
  }

  async create(storeId: string, data: NewSupplier): Promise<Supplier> {
    const { data: row, error } = await this.db
      .from('suppliers')
      .insert({
        store_id: storeId,
        name: data.name,
        contact_name: data.contactName ?? null,
        phone: data.phone ?? null,
        notes: data.notes ?? null,
      })
      .select()
      .single()

    if (error || !row) throw new Error(error?.message ?? 'Failed to create supplier')
    return toSupplier(row)
  }

  async update(storeId: string, supplierId: string, data: Partial<NewSupplier>): Promise<Supplier> {
    const patch: Record<string, unknown> = {}
    if (data.name !== undefined) patch.name = data.name
    if (data.contactName !== undefined) patch.contact_name = data.contactName || null
    if (data.phone !== undefined) patch.phone = data.phone || null
    if (data.notes !== undefined) patch.notes = data.notes || null

    const { data: row, error } = await this.db
      .from('suppliers')
      .update(patch)
      .eq('store_id', storeId)
      .eq('id', supplierId)
      .select()
      .single()

    if (error || !row) throw new Error(error?.message ?? 'Failed to update supplier')
    return toSupplier(row)
  }

  async archive(storeId: string, supplierId: string): Promise<void> {
    const { error } = await this.db
      .from('suppliers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('store_id', storeId)
      .eq('id', supplierId)

    if (error) throw new Error(error.message)
  }

  async findArchived(storeId: string): Promise<Supplier[]> {
    const { data, error } = await this.db
      .from('suppliers')
      .select('*')
      .eq('store_id', storeId)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(toSupplier)
  }

  async restore(storeId: string, supplierId: string): Promise<void> {
    const { error } = await this.db
      .from('suppliers')
      .update({ deleted_at: null })
      .eq('store_id', storeId)
      .eq('id', supplierId)

    if (error) throw new Error(error.message)
  }
}
