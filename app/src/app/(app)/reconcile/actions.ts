'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/infrastructure/supabase/server'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { InvoiceRepository } from '@/infrastructure/supabase/repositories/InvoiceRepository'
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

export async function applyInvoicePaymentAction(
  invoiceId: string,
  amount: number,
  paidAt: string,
  reference: string | null,
) {
  const { supabase, store } = await getContext()
  const invoiceRepo = new InvoiceRepository(supabase)
  await invoiceRepo.recordPayment(
    store.id,
    invoiceId,
    amount,
    'eft',
    reference ? `Bank reconcile · ${reference}` : `Bank reconcile · ${paidAt}`,
  )
  revalidatePath('/invoices')
  revalidatePath('/dashboard')
  revalidatePath('/reconcile')
}

export async function recordReconcileExpenseAction(
  category: string,
  description: string,
  amount: number,
  recordedAt: string,
) {
  const { supabase, store } = await getContext()
  const expenseRepo = new ExpenseRepository(supabase)
  await expenseRepo.create(store.id, {
    category,
    description,
    amount,
    recordedAt,
  })
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  revalidatePath('/reconcile')
}
