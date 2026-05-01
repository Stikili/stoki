import { SupabaseClient } from '@supabase/supabase-js'
import { IExpenseRepository } from '@/domain/repositories/IExpenseRepository'
import { Expense, NewExpense } from '@/domain/entities/expense'
import { toExpense } from '../mappers'

export class ExpenseRepository implements IExpenseRepository {
  constructor(private db: SupabaseClient) {}

  async findByPeriod(storeId: string, from: Date, to: Date): Promise<Expense[]> {
    const { data, error } = await this.db
      .from('expenses')
      .select('*')
      .eq('store_id', storeId)
      .gte('recorded_at', from.toISOString())
      .lte('recorded_at', to.toISOString())
      .order('recorded_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data ?? []).map(toExpense)
  }

  async create(storeId: string, data: NewExpense): Promise<Expense> {
    const { data: row, error } = await this.db
      .from('expenses')
      .insert({
        store_id: storeId,
        category: data.category,
        description: data.description,
        amount: data.amount,
        recorded_at: data.recordedAt ?? new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !row) throw new Error(error?.message ?? 'Failed to create expense')
    return toExpense(row)
  }

  async delete(storeId: string, expenseId: string): Promise<void> {
    const { error } = await this.db
      .from('expenses')
      .delete()
      .eq('store_id', storeId)
      .eq('id', expenseId)

    if (error) throw new Error(error.message)
  }

  async sumByPeriod(storeId: string, from: Date, to: Date): Promise<number> {
    const expenses = await this.findByPeriod(storeId, from, to)
    return expenses.reduce((sum, e) => sum + e.amount, 0)
  }
}
