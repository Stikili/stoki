'use server'

import { revalidatePath } from 'next/cache'
import { invalidateDashboard } from '@/lib/cache-tags'
import { redirect } from 'next/navigation'
import { createClient } from '@/infrastructure/supabase/server'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { InvoiceRepository } from '@/infrastructure/supabase/repositories/InvoiceRepository'
import { ExpenseRepository } from '@/infrastructure/supabase/repositories/ExpenseRepository'
import { BankReconciliationRepository } from '@/infrastructure/supabase/repositories/BankReconciliationRepository'
import { descriptionFingerprint } from '@/lib/csv-bank-statement'

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
  statementDate: string,
  rawDescription: string,
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

  const reconRepo = new BankReconciliationRepository(supabase)
  await reconRepo.upsert(store.id, {
    statementDate,
    amount,
    descriptionFingerprint: descriptionFingerprint(rawDescription),
  }, 'matched')

  revalidatePath('/invoices')
  revalidatePath('/dashboard')
  invalidateDashboard()
  revalidatePath('/reconcile')
}

export async function recordReconcileExpenseAction(
  category: string,
  description: string,
  amount: number,
  recordedAt: string,
  statementDate: string,
  rawDescription: string,
) {
  const { supabase, store } = await getContext()
  const expenseRepo = new ExpenseRepository(supabase)
  await expenseRepo.create(store.id, {
    category,
    description,
    amount,
    recordedAt,
  })

  const reconRepo = new BankReconciliationRepository(supabase)
  await reconRepo.upsert(store.id, {
    statementDate,
    amount,
    descriptionFingerprint: descriptionFingerprint(rawDescription),
  }, 'expensed')

  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  invalidateDashboard()
  revalidatePath('/reconcile')
}

export async function skipLineAction(
  statementDate: string,
  amount: number,
  rawDescription: string,
) {
  const { supabase, store } = await getContext()
  const reconRepo = new BankReconciliationRepository(supabase)
  await reconRepo.upsert(store.id, {
    statementDate,
    amount,
    descriptionFingerprint: descriptionFingerprint(rawDescription),
  }, 'skipped')
}
