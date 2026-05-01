'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/infrastructure/supabase/server'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { CustomerRepository } from '@/infrastructure/supabase/repositories/CustomerRepository'

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const storeRepo = new StoreRepository(supabase)
  const store = await storeRepo.getByOwnerId(user.id)
  if (!store) redirect('/login')
  return { supabase, store }
}

export async function addCustomerAction(formData: FormData) {
  const { supabase, store } = await getContext()
  const name = ((formData.get('name') as string) ?? '').trim()
  if (!name) return
  const repo = new CustomerRepository(supabase)
  await repo.create(store.id, {
    name,
    contactName: ((formData.get('contactName') as string) ?? '').trim() || undefined,
    email:       ((formData.get('email') as string) ?? '').trim() || undefined,
    phone:       ((formData.get('phone') as string) ?? '').trim() || undefined,
    vatNumber:   ((formData.get('vatNumber') as string) ?? '').trim() || undefined,
    billingAddress: ((formData.get('billingAddress') as string) ?? '').trim() || undefined,
    paymentTermsDays: parseInt((formData.get('paymentTermsDays') as string) ?? '30') || 30,
    notes:       ((formData.get('notes') as string) ?? '').trim() || undefined,
  })
  revalidatePath('/customers')
  revalidatePath('/invoices')
}

export async function editCustomerAction(formData: FormData) {
  const { supabase, store } = await getContext()
  const id = formData.get('id') as string
  if (!id) return
  const repo = new CustomerRepository(supabase)
  await repo.update(store.id, id, {
    name: (formData.get('name') as string)?.trim(),
    contactName:    ((formData.get('contactName') as string) ?? '').trim(),
    email:          ((formData.get('email') as string) ?? '').trim(),
    phone:          ((formData.get('phone') as string) ?? '').trim(),
    vatNumber:      ((formData.get('vatNumber') as string) ?? '').trim(),
    billingAddress: ((formData.get('billingAddress') as string) ?? '').trim(),
    paymentTermsDays: parseInt((formData.get('paymentTermsDays') as string) ?? '30') || 30,
    notes:          ((formData.get('notes') as string) ?? '').trim(),
  })
  revalidatePath('/customers')
  revalidatePath('/invoices')
}

export async function archiveCustomerAction(customerId: string) {
  const { supabase, store } = await getContext()
  const repo = new CustomerRepository(supabase)
  await repo.archive(store.id, customerId)
  revalidatePath('/customers')
  revalidatePath('/invoices')
}
