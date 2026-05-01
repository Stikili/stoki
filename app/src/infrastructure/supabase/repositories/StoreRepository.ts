import { SupabaseClient } from '@supabase/supabase-js'
import { IStoreRepository } from '@/domain/repositories/IStoreRepository'
import { Store, StoreCategory } from '@/domain/entities/store'
import { toStore } from '../mappers'
import { normalizeZAPhone } from '@/lib/whatsapp'

export class StoreRepository implements IStoreRepository {
  constructor(private db: SupabaseClient) {}

  async findAllByOwner(ownerId: string): Promise<Store[]> {
    const { data, error } = await this.db
      .from('stores')
      .select('*')
      .eq('owner_id', ownerId)
      .is('deleted_at', null)
      .order('created_at')

    if (error) throw new Error(error.message)
    return (data ?? []).map(toStore)
  }

  async getByOwnerId(ownerId: string): Promise<Store | null> {
    const { data, error } = await this.db
      .from('stores')
      .select('*')
      .eq('owner_id', ownerId)
      .is('deleted_at', null)
      .single()

    if (error || !data) return null
    return toStore(data)
  }

  async create(ownerId: string, name: string, phone?: string): Promise<Store> {
    const { data, error } = await this.db
      .from('stores')
      .insert({ owner_id: ownerId, name, phone: phone ?? null })
      .select()
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Failed to create store')
    return toStore(data)
  }

  async findByWhatsAppNumber(phone: string): Promise<Store | null> {
    const { data, error } = await this.db
      .from('stores')
      .select('*')
      .eq('whatsapp_number', normalizeZAPhone(phone))
      .is('deleted_at', null)
      .single()
    if (error || !data) return null
    return toStore(data)
  }

  async update(storeId: string, patch: {
    name?: string
    phone?: string
    category?: StoreCategory
    location?: string
    whatsappNumber?: string
    onboardingCompleted?: boolean
    vatRegistered?: boolean
    vatNumber?: string | null
    vatRate?: number
    businessAddress?: string | null
  }): Promise<Store> {
    const dbPatch: Record<string, unknown> = {}
    if (patch.name !== undefined) dbPatch.name = patch.name
    if (patch.phone !== undefined) dbPatch.phone = patch.phone
    if (patch.category !== undefined) dbPatch.category = patch.category
    if (patch.location !== undefined) dbPatch.location = patch.location
    if (patch.whatsappNumber !== undefined) dbPatch.whatsapp_number = patch.whatsappNumber ? normalizeZAPhone(patch.whatsappNumber) : null
    if (patch.onboardingCompleted !== undefined) dbPatch.onboarding_completed = patch.onboardingCompleted
    if (patch.vatRegistered !== undefined) dbPatch.vat_registered = patch.vatRegistered
    if (patch.vatNumber !== undefined) dbPatch.vat_number = patch.vatNumber || null
    if (patch.vatRate !== undefined) dbPatch.vat_rate = patch.vatRate
    if (patch.businessAddress !== undefined) dbPatch.business_address = patch.businessAddress || null
    const { data, error } = await this.db
      .from('stores')
      .update(dbPatch)
      .eq('id', storeId)
      .select()
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Failed to update store')
    return toStore(data)
  }

  async delete(storeId: string): Promise<void> {
    const { error } = await this.db
      .from('stores')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', storeId)

    if (error) throw new Error(error.message)
  }
}
