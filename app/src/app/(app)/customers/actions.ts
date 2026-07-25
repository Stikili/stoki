'use server'

import { revalidatePath } from 'next/cache'
import { CustomerRepository } from '@/infrastructure/supabase/repositories/CustomerRepository'
import { getServerData } from '@/lib/getServerData'
import { assertNotCashier, denyIfCashier } from '@/lib/role-guards'

/**
 * B2B customer CRUD — assertNotCashier on every action. Cashiers deal
 * with walk-ins at the till (recorded as debtors, or as anonymous
 * sales); the formal B2B customer book (with tax numbers, payment
 * terms, billing addresses) is a back-office manager+ concern.
 */
export async function addCustomerAction(formData: FormData): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { supabase, store, role } = await getServerData()
  const denied = denyIfCashier(role, 'add a B2B customer')
  if (denied) return denied
  const name = ((formData.get('name') as string) ?? '').trim()
  if (!name) return { ok: false, error: 'Name is required' }
  const repo = new CustomerRepository(supabase)
  const customer = await repo.create(store.id, {
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
  return { ok: true, id: customer.id }
}

export async function editCustomerAction(formData: FormData) {
  const { supabase, store, role } = await getServerData()
  assertNotCashier(role, 'edit a B2B customer')
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
    marketingOptIn: formData.get('marketingOptIn') === 'on',
  })
  revalidatePath('/customers')
  revalidatePath('/invoices')
  revalidatePath('/broadcasts')
}

export async function archiveCustomerAction(customerId: string) {
  const { supabase, store, role } = await getServerData()
  assertNotCashier(role, 'archive a B2B customer')
  const repo = new CustomerRepository(supabase)
  await repo.archive(store.id, customerId)
  revalidatePath('/customers')
  revalidatePath('/invoices')
}

export async function restoreCustomerAction(customerId: string) {
  const { supabase, store, role } = await getServerData()
  assertNotCashier(role, 'restore a B2B customer')
  const repo = new CustomerRepository(supabase)
  await repo.restore(store.id, customerId)
  revalidatePath('/customers')
  revalidatePath('/invoices')
}
