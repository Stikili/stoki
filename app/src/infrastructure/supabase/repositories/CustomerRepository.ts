import { SupabaseClient } from '@supabase/supabase-js'
import { ICustomerRepository } from '@/domain/repositories/ICustomerRepository'
import { Customer, NewCustomer } from '@/domain/entities/customer'
import { toCustomer } from '../mappers'

export class CustomerRepository implements ICustomerRepository {
  constructor(private db: SupabaseClient) {}

  async findAll(storeId: string): Promise<Customer[]> {
    const { data, error } = await this.db
      .from('customers')
      .select('*')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .order('name')
    if (error) throw new Error(error.message)
    return (data ?? []).map(toCustomer)
  }

  async findById(storeId: string, id: string): Promise<Customer | null> {
    const { data, error } = await this.db
      .from('customers')
      .select('*')
      .eq('store_id', storeId)
      .eq('id', id)
      .is('deleted_at', null)
      .single()
    if (error || !data) return null
    return toCustomer(data)
  }

  async create(storeId: string, data: NewCustomer): Promise<Customer> {
    const { data: row, error } = await this.db
      .from('customers')
      .insert({
        store_id: storeId,
        name: data.name,
        contact_name: data.contactName ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        vat_number: data.vatNumber ?? null,
        billing_address: data.billingAddress ?? null,
        payment_terms_days: data.paymentTermsDays ?? 30,
        notes: data.notes ?? null,
      })
      .select()
      .single()
    if (error || !row) throw new Error(error?.message ?? 'Failed to create customer')
    return toCustomer(row)
  }

  async update(storeId: string, id: string, data: Partial<NewCustomer>): Promise<Customer> {
    const patch: Record<string, unknown> = {}
    if (data.name !== undefined) patch.name = data.name
    if (data.contactName !== undefined) patch.contact_name = data.contactName || null
    if (data.email !== undefined) patch.email = data.email || null
    if (data.phone !== undefined) patch.phone = data.phone || null
    if (data.vatNumber !== undefined) patch.vat_number = data.vatNumber || null
    if (data.billingAddress !== undefined) patch.billing_address = data.billingAddress || null
    if (data.paymentTermsDays !== undefined) patch.payment_terms_days = data.paymentTermsDays
    if (data.notes !== undefined) patch.notes = data.notes || null

    const { data: row, error } = await this.db
      .from('customers')
      .update(patch)
      .eq('store_id', storeId)
      .eq('id', id)
      .select()
      .single()
    if (error || !row) throw new Error(error?.message ?? 'Failed to update customer')
    return toCustomer(row)
  }

  async archive(storeId: string, id: string): Promise<void> {
    const { error } = await this.db
      .from('customers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('store_id', storeId)
      .eq('id', id)
    if (error) throw new Error(error.message)
  }

  async findArchived(storeId: string): Promise<Customer[]> {
    const { data, error } = await this.db
      .from('customers')
      .select('*')
      .eq('store_id', storeId)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(toCustomer)
  }

  async restore(storeId: string, id: string): Promise<void> {
    const { error } = await this.db
      .from('customers')
      .update({ deleted_at: null })
      .eq('store_id', storeId)
      .eq('id', id)
    if (error) throw new Error(error.message)
  }
}
