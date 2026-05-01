'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/infrastructure/supabase/server'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { SupplierRepository } from '@/infrastructure/supabase/repositories/SupplierRepository'

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const storeRepo = new StoreRepository(supabase)
  const store = await storeRepo.getByOwnerId(user.id)
  if (!store) redirect('/login')
  return { supabase, store }
}

export async function addSupplierAction(formData: FormData) {
  const { supabase, store } = await getContext()
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
  const { supabase, store } = await getContext()
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
  const { supabase, store } = await getContext()
  const repo = new SupplierRepository(supabase)
  await repo.archive(store.id, supplierId)
  revalidatePath('/suppliers')
  revalidatePath('/inventory')
}
