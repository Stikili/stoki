'use server'

import { revalidatePath } from 'next/cache'
import { SupplierRepository } from '@/infrastructure/supabase/repositories/SupplierRepository'
import { getServerData } from '@/lib/getServerData'
import { assertNotCashier } from '@/lib/role-guards'

/**
 * Supplier CRUD is entirely back-office. Cashiers never touch this — a
 * supplier record represents an ongoing procurement relationship, not
 * a till-side workflow. Every action is assertNotCashier.
 */
export async function addSupplierAction(formData: FormData) {
  const { supabase, store, role } = await getServerData()
  assertNotCashier(role, 'add a supplier')
  const repo = new SupplierRepository(supabase)
  const name = ((formData.get('name') as string) ?? '').trim()
  if (!name) return
  await repo.create(store.id, {
    name,
    contactName: ((formData.get('contactName') as string) ?? '').trim() || undefined,
    phone: ((formData.get('phone') as string) ?? '').trim() || undefined,
    notes: ((formData.get('notes') as string) ?? '').trim() || undefined,
  })
  revalidatePath('/suppliers')
  revalidatePath('/inventory')
}

export async function editSupplierAction(formData: FormData) {
  const { supabase, store, role } = await getServerData()
  assertNotCashier(role, 'edit a supplier')
  const repo = new SupplierRepository(supabase)
  const id = formData.get('id') as string
  if (!id) return
  await repo.update(store.id, id, {
    name: (formData.get('name') as string)?.trim(),
    contactName: ((formData.get('contactName') as string) ?? '').trim(),
    phone: ((formData.get('phone') as string) ?? '').trim(),
    notes: ((formData.get('notes') as string) ?? '').trim(),
  })
  revalidatePath('/suppliers')
  revalidatePath('/inventory')
}

export async function archiveSupplierAction(supplierId: string) {
  const { supabase, store, role } = await getServerData()
  assertNotCashier(role, 'archive a supplier')
  const repo = new SupplierRepository(supabase)
  await repo.archive(store.id, supplierId)
  revalidatePath('/suppliers')
  revalidatePath('/inventory')
}

export async function restoreSupplierAction(supplierId: string) {
  const { supabase, store, role } = await getServerData()
  assertNotCashier(role, 'restore a supplier')
  const repo = new SupplierRepository(supabase)
  await repo.restore(store.id, supplierId)
  revalidatePath('/suppliers')
  revalidatePath('/inventory')
}
