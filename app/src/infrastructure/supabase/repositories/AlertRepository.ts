import { SupabaseClient } from '@supabase/supabase-js'
import { IAlertRepository } from '@/domain/repositories/IAlertRepository'
import { Alert, AlertType } from '@/domain/entities/alert'
import { toAlert } from '../mappers'

export class AlertRepository implements IAlertRepository {
  constructor(private db: SupabaseClient) {}

  async findAll(storeId: string): Promise<Alert[]> {
    const { data, error } = await this.db
      .from('alerts')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw new Error(error.message)
    return (data ?? []).map(toAlert)
  }

  async findUnread(storeId: string): Promise<Alert[]> {
    const { data, error } = await this.db
      .from('alerts')
      .select('*')
      .eq('store_id', storeId)
      .is('read_at', null)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data ?? []).map(toAlert)
  }

  async create(storeId: string, type: AlertType, message: string): Promise<Alert> {
    const { data, error } = await this.db
      .from('alerts')
      .insert({ store_id: storeId, type, message })
      .select()
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Failed to create alert')
    return toAlert(data)
  }

  async markRead(storeId: string, alertId: string): Promise<void> {
    const { error } = await this.db
      .from('alerts')
      .update({ read_at: new Date().toISOString() })
      .eq('store_id', storeId)
      .eq('id', alertId)

    if (error) throw new Error(error.message)
  }

  async markAllRead(storeId: string): Promise<void> {
    const { error } = await this.db
      .from('alerts')
      .update({ read_at: new Date().toISOString() })
      .eq('store_id', storeId)
      .is('read_at', null)

    if (error) throw new Error(error.message)
  }

  async markActionTaken(storeId: string, alertId: string): Promise<void> {
    const { error } = await this.db
      .from('alerts')
      .update({ action_taken_at: new Date().toISOString() })
      .eq('store_id', storeId)
      .eq('id', alertId)

    if (error) throw new Error(error.message)
  }
}
