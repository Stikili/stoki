'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { TAGS , invalidateDashboard } from '@/lib/cache-tags'
import { DebtorRepository } from '@/infrastructure/supabase/repositories/DebtorRepository'
import { CreditEntryRepository } from '@/infrastructure/supabase/repositories/CreditEntryRepository'
import { AlertRepository } from '@/infrastructure/supabase/repositories/AlertRepository'
import { recordCredit } from '@/application/credit/recordCredit'
import { getServerData } from '@/lib/getServerData'
import { assertNotCashier } from '@/lib/role-guards'

/**
 * Role model for the credit book:
 *   - createDebtor / clearDebt → assertNotCashier. Creating a customer
 *     record + wiping a balance are back-office decisions; the till
 *     shouldn't rewrite the ledger.
 *   - addCredit / settlePartial → open to cashier. These are the two
 *     everyday till workflows: "put this on Mama Thabo's tab" and
 *     "Mama Thabo just paid R100 off her tab".
 */
export async function createDebtorAction(formData: FormData) {
  const { supabase, store, role } = await getServerData()
  assertNotCashier(role, 'add a credit customer')
  const debtorRepo = new DebtorRepository(supabase)
  const creditRepo = new CreditEntryRepository(supabase)
  const alertRepo = new AlertRepository(supabase)

  const debtor = await debtorRepo.create(store.id, {
    name: (formData.get('name') as string).trim(),
    phone: ((formData.get('phone') as string) || '').trim() || undefined,
    address: ((formData.get('address') as string) || '').trim() || undefined,
  })

  // The "add customer" form also collects an opening credit entry —
  // description + amount. Skip the entry if the user left amount blank
  // so the debtor still gets created cleanly with a R0 balance.
  const description = ((formData.get('description') as string) || '').trim()
  const amount = parseFloat((formData.get('amount') as string) || '0')
  if (Number.isFinite(amount) && amount > 0) {
    await recordCredit(creditRepo, debtorRepo, alertRepo, store.id, {
      debtorId: debtor.id,
      amount,
      description: description || undefined,
    })
  }

  revalidateTag(TAGS.debtors, 'default')
  revalidatePath('/credit')
  revalidatePath('/dashboard')
  invalidateDashboard(store.id)
}

export async function addCreditAction(formData: FormData) {
  const { supabase, store } = await getServerData()
  const creditRepo = new CreditEntryRepository(supabase)
  const debtorRepo = new DebtorRepository(supabase)
  const alertRepo = new AlertRepository(supabase)

  await recordCredit(creditRepo, debtorRepo, alertRepo, store.id, {
    debtorId: formData.get('debtorId') as string,
    amount: parseFloat(formData.get('amount') as string) || 0,
    description: ((formData.get('description') as string) || '').trim() || undefined,
  })

  revalidateTag(TAGS.debtors, 'default')
  revalidatePath('/credit')
  revalidatePath('/dashboard')
  invalidateDashboard(store.id)
  revalidatePath('/alerts')
}

export async function clearDebtAction(debtorId: string, currentOwed: number) {
  const { supabase, store, role } = await getServerData()
  assertNotCashier(role, 'clear a debt')
  const debtorRepo = new DebtorRepository(supabase)

  if (currentOwed > 0) {
    await debtorRepo.updateOwed(store.id, debtorId, -currentOwed)
  }

  revalidateTag(TAGS.debtors, 'default')
  revalidatePath('/credit')
  revalidatePath('/dashboard')
  invalidateDashboard(store.id)
}

export async function settlePartialAction(debtorId: string, amount: number) {
  if (amount <= 0) return
  const { supabase, store } = await getServerData()
  const debtorRepo = new DebtorRepository(supabase)

  await debtorRepo.updateOwed(store.id, debtorId, -amount)

  revalidateTag(TAGS.debtors, 'default')
  revalidatePath('/credit')
  revalidatePath('/dashboard')
  invalidateDashboard(store.id)
}
