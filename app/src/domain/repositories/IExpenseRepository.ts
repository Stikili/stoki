import { Expense, NewExpense } from '@/domain/entities/expense'

export interface IExpenseRepository {
  create(storeId: string, data: NewExpense): Promise<Expense>
  findByPeriod(storeId: string, from: Date, to: Date): Promise<Expense[]>
  delete(storeId: string, expenseId: string): Promise<void>
}
