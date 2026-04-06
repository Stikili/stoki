'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { TAGS } from '@/lib/cache-tags'
import { createClient } from '@/infrastructure/supabase/server'
import { redirect } from 'next/navigation'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { ProductRepository } from '@/infrastructure/supabase/repositories/ProductRepository'
import { AlertRepository } from '@/infrastructure/supabase/repositories/AlertRepository'
import { addProduct } from '@/application/inventory/addProduct'
import { restockProduct } from '@/application/inventory/restockProduct'

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const storeRepo = new StoreRepository(supabase)
  const store = await storeRepo.getByOwnerId(user.id)
  if (!store) redirect('/login')
  return { supabase, store }
}

export async function addProductAction(formData: FormData) {
  const { supabase, store } = await getContext()
  const productRepo = new ProductRepository(supabase)
  const alertRepo = new AlertRepository(supabase)

  await addProduct(productRepo, alertRepo, store.id, {
    name: formData.get('name') as string,
    price: parseFloat(formData.get('price') as string) || 0,
    cost: parseFloat(formData.get('cost') as string) || 0,
    qty: parseInt(formData.get('qty') as string) || 0,
    reorderPoint: parseInt(formData.get('reorderPoint') as string) || 5,
    sku: (formData.get('sku') as string) || undefined,
  })

  revalidateTag(TAGS.products, 'default')
  revalidatePath('/inventory')
  revalidatePath('/dashboard')
}

export async function restockAction(formData: FormData) {
  const { supabase, store } = await getContext()
  const productRepo = new ProductRepository(supabase)
  const alertRepo = new AlertRepository(supabase)

  await restockProduct(
    productRepo,
    alertRepo,
    store.id,
    formData.get('productId') as string,
    parseInt(formData.get('qty') as string) || 0,
  )

  revalidateTag(TAGS.products, 'default')
  revalidatePath('/inventory')
  revalidatePath('/dashboard')
}

export async function editProductAction(formData: FormData) {
  const { supabase, store } = await getContext()
  const productRepo = new ProductRepository(supabase)
  const productId = formData.get('productId') as string

  await productRepo.update(store.id, productId, {
    name: formData.get('name') as string,
    price: parseFloat(formData.get('price') as string) || 0,
    cost: parseFloat(formData.get('cost') as string) || 0,
    qty: parseInt(formData.get('qty') as string) || 0,
    reorderPoint: parseInt(formData.get('reorderPoint') as string) || 5,
    sku: (formData.get('sku') as string) || undefined,
  })

  revalidateTag(TAGS.products, 'default')
  revalidatePath('/inventory')
  revalidatePath('/dashboard')
}

export async function archiveProductAction(productId: string) {
  const { supabase, store } = await getContext()
  const productRepo = new ProductRepository(supabase)

  await productRepo.archive(store.id, productId)

  revalidateTag(TAGS.products, 'default')
  revalidatePath('/inventory')
  revalidatePath('/dashboard')
}
