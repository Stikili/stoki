'use server'

import { revalidatePath } from 'next/cache'
import { invalidateDashboard } from '@/lib/cache-tags'
import { createClient } from '@/infrastructure/supabase/server'
import { redirect } from 'next/navigation'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { ExpenseRepository } from '@/infrastructure/supabase/repositories/ExpenseRepository'

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const storeRepo = new StoreRepository(supabase)
  const store = await storeRepo.getByOwnerId(user.id)
  if (!store) redirect('/login')
  return { supabase, store }
}

export async function addExpenseAction(formData: FormData) {
  const { supabase, store } = await getContext()
  const expenseRepo = new ExpenseRepository(supabase)

  await expenseRepo.create(store.id, {
    category: formData.get('category') as string || 'other',
    description: (formData.get('description') as string).trim(),
    amount: parseFloat(formData.get('amount') as string) || 0,
    isCapital: formData.get('isCapital') === 'on',
  })

  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  invalidateDashboard()
}

export async function deleteExpenseAction(expenseId: string) {
  const { supabase, store } = await getContext()
  const expenseRepo = new ExpenseRepository(supabase)
  await expenseRepo.delete(store.id, expenseId)
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  invalidateDashboard()
}
