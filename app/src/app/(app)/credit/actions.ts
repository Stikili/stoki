'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { TAGS } from '@/lib/cache-tags'
import { createClient } from '@/infrastructure/supabase/server'
import { redirect } from 'next/navigation'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { DebtorRepository } from '@/infrastructure/supabase/repositories/DebtorRepository'
import { CreditEntryRepository } from '@/infrastructure/supabase/repositories/CreditEntryRepository'
import { AlertRepository } from '@/infrastructure/supabase/repositories/AlertRepository'
import { recordCredit } from '@/application/credit/recordCredit'

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const storeRepo = new StoreRepository(supabase)
  const store = await storeRepo.getByOwnerId(user.id)
  if (!store) redirect('/login')
  return { supabase, store }
}

export async function createDebtorAction(formData: FormData) {
  const { supabase, store } = await getContext()
  const debtorRepo = new DebtorRepository(supabase)

  await debtorRepo.create(store.id, {
    name: formData.get('name') as string,
    phone: (formData.get('phone') as string) || undefined,
  })

  revalidateTag(TAGS.debtors, 'default')
  revalidatePath('/credit')
}

export async function addCreditAction(formData: FormData) {
  const { supabase, store } = await getContext()
  const creditRepo = new CreditEntryRepository(supabase)
  const debtorRepo = new DebtorRepository(supabase)
  const alertRepo = new AlertRepository(supabase)

  await recordCredit(creditRepo, debtorRepo, alertRepo, store.id, {
    debtorId: formData.get('debtorId') as string,
    amount: parseFloat(formData.get('amount') as string) || 0,
  })

  revalidateTag(TAGS.debtors, 'default')
  revalidatePath('/credit')
  revalidatePath('/dashboard')
  revalidatePath('/alerts')
}

export async function clearDebtAction(debtorId: string, currentOwed: number) {
  const { supabase, store } = await getContext()
  const debtorRepo = new DebtorRepository(supabase)

  if (currentOwed > 0) {
    await debtorRepo.updateOwed(store.id, debtorId, -currentOwed)
  }

  revalidateTag(TAGS.debtors, 'default')
  revalidatePath('/credit')
  revalidatePath('/dashboard')
}

export async function settlePartialAction(debtorId: string, amount: number) {
  if (amount <= 0) return
  const { supabase, store } = await getContext()
  const debtorRepo = new DebtorRepository(supabase)

  await debtorRepo.updateOwed(store.id, debtorId, -amount)

  revalidateTag(TAGS.debtors, 'default')
  revalidatePath('/credit')
  revalidatePath('/dashboard')
}
