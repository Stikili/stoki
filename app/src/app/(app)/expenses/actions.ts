'use server'

import { revalidatePath } from 'next/cache'
import { invalidateDashboard } from '@/lib/cache-tags'
import { ExpenseRepository } from '@/infrastructure/supabase/repositories/ExpenseRepository'
import { getServerData } from '@/lib/getServerData'
import { assertNotCashier } from '@/lib/role-guards'

/**
 * Cashiers commonly need to log petty-cash spends at the till (fuel run,
 * cleaning supplies), so `addExpense` is available to everyone.
 * Deleting history is a manager/owner call — cashiers can't undo their
 * own or anyone else's expense rows.
 */
export async function addExpenseAction(formData: FormData) {
  const { supabase, store } = await getServerData()
  const expenseRepo = new ExpenseRepository(supabase)

  await expenseRepo.create(store.id, {
    category: formData.get('category') as string || 'other',
    description: (formData.get('description') as string).trim(),
    amount: parseFloat(formData.get('amount') as string) || 0,
    isCapital: formData.get('isCapital') === 'on',
  })

  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  invalidateDashboard(store.id)
}

export async function deleteExpenseAction(expenseId: string) {
  const { supabase, store, role } = await getServerData()
  assertNotCashier(role, 'delete an expense')
  const expenseRepo = new ExpenseRepository(supabase)
  await expenseRepo.delete(store.id, expenseId)
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  invalidateDashboard(store.id)
}
