import { SupabaseClient } from '@supabase/supabase-js'
import { IStoreUserRepository } from '@/domain/repositories/IStoreUserRepository'
import { StoreUser, StoreRole } from '@/domain/entities/store-user'
import { toStoreUser } from '../mappers'

export class StoreUserRepository implements IStoreUserRepository {
  constructor(private db: SupabaseClient) {}

  async findByStore(storeId: string): Promise<StoreUser[]> {
    const { data, error } = await this.db
      .from('store_users')
      .select('*')
      .eq('store_id', storeId)
      .order('joined_at')

    if (error) throw new Error(error.message)
    return (data ?? []).map(toStoreUser)
  }

  async findRoleForUser(storeId: string, userId: string): Promise<StoreRole | null> {
    const { data, error } = await this.db
      .from('store_users')
      .select('role')
      .eq('store_id', storeId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error || !data) return null
    return data.role as StoreRole
  }

  async add(storeId: string, userId: string, role: StoreRole, invitedBy: string): Promise<StoreUser> {
    const { data, error } = await this.db
      .from('store_users')
      .insert({
        store_id: storeId,
        user_id: userId,
        role,
        invited_by: invitedBy,
      })
      .select()
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Failed to add team member')
    return toStoreUser(data)
  }

  async updateRole(storeId: string, userId: string, role: StoreRole): Promise<void> {
    const { error } = await this.db
      .from('store_users')
      .update({ role })
      .eq('store_id', storeId)
      .eq('user_id', userId)

    if (error) throw new Error(error.message)
  }

  async remove(storeId: string, userId: string): Promise<void> {
    const { error } = await this.db
      .from('store_users')
      .delete()
      .eq('store_id', storeId)
      .eq('user_id', userId)

    if (error) throw new Error(error.message)
  }
}
