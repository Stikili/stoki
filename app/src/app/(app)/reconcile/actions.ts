'use server'

import { revalidatePath } from 'next/cache'
import { invalidateDashboard } from '@/lib/cache-tags'
import { InvoiceRepository } from '@/infrastructure/supabase/repositories/InvoiceRepository'
import { ExpenseRepository } from '@/infrastructure/supabase/repositories/ExpenseRepository'
import { BankReconciliationRepository } from '@/infrastructure/supabase/repositories/BankReconciliationRepository'
import { descriptionFingerprint } from '@/lib/csv-bank-statement'
import { getServerData } from '@/lib/getServerData'
import { assertNotCashier } from '@/lib/role-guards'

/**
 * Bank statement reconciliation writes invoice payments + expense rows
 * from CSV import — every action here mutates the ledger. Cashier-blocked
 * on all three actions.
 */
export async function applyInvoicePaymentAction(
  invoiceId: string,
  amount: number,
  paidAt: string,
  reference: string | null,
  statementDate: string,
  rawDescription: string,
) {
  const { supabase, store, role } = await getServerData()
  assertNotCashier(role, 'apply an invoice payment from bank rec')
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
  invalidateDashboard(store.id)
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
  const { supabase, store, role } = await getServerData()
  assertNotCashier(role, 'record a reconciled expense')
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
  invalidateDashboard(store.id)
  revalidatePath('/reconcile')
}

export async function skipLineAction(
  statementDate: string,
  amount: number,
  rawDescription: string,
) {
  const { supabase, store, role } = await getServerData()
  assertNotCashier(role, 'skip a bank rec line')
  const reconRepo = new BankReconciliationRepository(supabase)
  await reconRepo.upsert(store.id, {
    statementDate,
    amount,
    descriptionFingerprint: descriptionFingerprint(rawDescription),
  }, 'skipped')
}
