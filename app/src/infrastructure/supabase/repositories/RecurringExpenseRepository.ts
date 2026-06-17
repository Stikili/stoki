import { SupabaseClient } from '@supabase/supabase-js'
import {
  RecurringExpense, NewRecurringExpense,
} from '@/domain/entities/recurring-expense'
import { toRecurringExpense } from '../mappers'

export class RecurringExpenseRepository {
  constructor(private db: SupabaseClient) {}

  async findAll(storeId: string): Promise<RecurringExpense[]> {
    const { data, error } = await this.db
      .from('recurring_expenses')
      .select('*')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .order('next_due_at', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []).map(toRecurringExpense)
  }

  async findActive(storeId: string): Promise<RecurringExpense[]> {
    const { data, error } = await this.db
      .from('recurring_expenses')
      .select('*')
      .eq('store_id', storeId)
      .eq('active', true)
      .is('deleted_at', null)
      .order('next_due_at', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []).map(toRecurringExpense)
  }

  async findDue(storeId: string, asOf: Date): Promise<RecurringExpense[]> {
    const { data, error } = await this.db
      .from('recurring_expenses')
      .select('*')
      .eq('store_id', storeId)
      .eq('active', true)
      .is('deleted_at', null)
      .lte('next_due_at', asOf.toISOString())
    if (error) throw new Error(error.message)
    return (data ?? []).map(toRecurringExpense)
  }

  async create(
    storeId: string,
    data: NewRecurringExpense & { nextDueAt: string },
  ): Promise<RecurringExpense> {
    const { data: row, error } = await this.db
      .from('recurring_expenses')
      .insert({
        store_id: storeId,
        category: data.category,
        description: data.description,
        amount: data.amount,
        is_capital: data.isCapital ?? false,
        frequency: data.frequency,
        day_value: data.dayValue,
        next_due_at: data.nextDueAt,
      })
      .select()
      .single()
    if (error || !row) throw new Error(error?.message ?? 'Failed to create rule')
    return toRecurringExpense(row)
  }

  async update(
    storeId: string,
    id: string,
    patch: Partial<NewRecurringExpense & { nextDueAt: string; active: boolean }>,
  ): Promise<RecurringExpense> {
    const dbPatch: Record<string, unknown> = {}
    if (patch.category !== undefined) dbPatch.category = patch.category
    if (patch.description !== undefined) dbPatch.description = patch.description
    if (patch.amount !== undefined) dbPatch.amount = patch.amount
    if (patch.isCapital !== undefined) dbPatch.is_capital = patch.isCapital
    if (patch.frequency !== undefined) dbPatch.frequency = patch.frequency
    if (patch.dayValue !== undefined) dbPatch.day_value = patch.dayValue
    if (patch.nextDueAt !== undefined) dbPatch.next_due_at = patch.nextDueAt
    if (patch.active !== undefined) dbPatch.active = patch.active

    const { data: row, error } = await this.db
      .from('recurring_expenses')
      .update(dbPatch)
      .eq('store_id', storeId)
      .eq('id', id)
      .select()
      .single()
    if (error || !row) throw new Error(error?.message ?? 'Failed to update rule')
    return toRecurringExpense(row)
  }

  /** After spawning an expense row, advance next_due_at and stamp last_posted. */
  async markPosted(
    storeId: string,
    id: string,
    nextDueAt: string,
    postedAt: string,
  ): Promise<void> {
    const { error } = await this.db
      .from('recurring_expenses')
      .update({ next_due_at: nextDueAt, last_posted_at: postedAt })
      .eq('store_id', storeId)
      .eq('id', id)
    if (error) throw new Error(error.message)
  }

  async archive(storeId: string, id: string): Promise<void> {
    const { error } = await this.db
      .from('recurring_expenses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('store_id', storeId)
      .eq('id', id)
    if (error) throw new Error(error.message)
  }
}
