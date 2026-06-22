'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { TAGS , invalidateDashboard } from '@/lib/cache-tags'
import { createClient } from '@/infrastructure/supabase/server'
import { redirect } from 'next/navigation'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { ProductRepository } from '@/infrastructure/supabase/repositories/ProductRepository'
import { AlertRepository } from '@/infrastructure/supabase/repositories/AlertRepository'
import { addProduct } from '@/application/inventory/addProduct'
import { recordRestock } from '@/application/inventory/recordRestock'
import { recordWastage } from '@/application/inventory/recordWastage'
import { RestockRepository } from '@/infrastructure/supabase/repositories/RestockRepository'
import { WastageRepository } from '@/infrastructure/supabase/repositories/WastageRepository'
import { parseProductCsv } from '@/lib/csv-products'
import { WastageReason } from '@/domain/entities/wastage'

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

  // qty / reorder_point are numeric(10,3) post-migration-015 — parseFloat
  // accepts both integers (piece goods) and decimal weights uniformly.
  await addProduct(productRepo, alertRepo, store.id, {
    name: formData.get('name') as string,
    price: parseFloat(formData.get('price') as string) || 0,
    cost: parseFloat(formData.get('cost') as string) || 0,
    qty: parseFloat(formData.get('qty') as string) || 0,
    reorderPoint: parseFloat(formData.get('reorderPoint') as string) || 5,
    sku: (formData.get('sku') as string) || undefined,
  })

  revalidateTag(TAGS.products, 'default')
  revalidatePath('/inventory')
  revalidatePath('/dashboard')
  invalidateDashboard(store.id)
}

export async function restockAction(formData: FormData) {
  const { supabase, store } = await getContext()
  const productRepo = new ProductRepository(supabase)
  const restockRepo = new RestockRepository(supabase)
  const alertRepo = new AlertRepository(supabase)

  const costRaw = formData.get('cost') as string | null
  const supplierIdRaw = formData.get('supplierId') as string | null
  const notesRaw = formData.get('notes') as string | null
  const cost = costRaw && costRaw.trim() ? parseFloat(costRaw) : undefined

  await recordRestock(productRepo, restockRepo, alertRepo, store.id, {
    productId: formData.get('productId') as string,
    qtyAdded: parseFloat(formData.get('qty') as string) || 0,
    cost: cost && cost > 0 ? cost : undefined,
    supplierId: supplierIdRaw && supplierIdRaw.trim() ? supplierIdRaw : undefined,
    notes: notesRaw && notesRaw.trim() ? notesRaw : undefined,
  })

  revalidateTag(TAGS.products, 'default')
  revalidatePath('/inventory')
  revalidatePath('/dashboard')
  invalidateDashboard(store.id)
  revalidatePath('/cashup')
}

export async function editProductAction(formData: FormData) {
  const { supabase, store } = await getContext()
  const productRepo = new ProductRepository(supabase)
  const productId = formData.get('productId') as string
  const vatInclusiveRaw = formData.get('vatInclusive')
  // Only update vat_inclusive if the form actually surfaced the field (VAT-registered stores).
  const vatInclusive = vatInclusiveRaw !== null
    ? vatInclusiveRaw === 'on'
    : undefined
  const isAirtime = formData.get('isAirtime') === 'on'
  const isWeighable = formData.get('isWeighable') === 'on'
  const unitLabelRaw = formData.get('unitLabel') as string | null
  const unitLabel: 'each' | 'kg' | 'g' | 'l' | 'ml' = (() => {
    if (unitLabelRaw === 'kg' || unitLabelRaw === 'g' || unitLabelRaw === 'l' || unitLabelRaw === 'ml') return unitLabelRaw
    return 'each'
  })()
  const vatCodeRaw = formData.get('vatCode') as string | null
  const vatCode: 'standard' | 'zero' | 'exempt' | undefined =
    vatCodeRaw === 'standard' || vatCodeRaw === 'zero' || vatCodeRaw === 'exempt'
      ? vatCodeRaw
      : undefined

  await productRepo.update(store.id, productId, {
    name: formData.get('name') as string,
    price: parseFloat(formData.get('price') as string) || 0,
    cost: parseFloat(formData.get('cost') as string) || 0,
    qty: parseFloat(formData.get('qty') as string) || 0,
    reorderPoint: parseFloat(formData.get('reorderPoint') as string) || 5,
    sku: (formData.get('sku') as string) || undefined,
    expiryDate: (formData.get('expiryDate') as string) || undefined,
    vatInclusive,
    isAirtime,
    isWeighable,
    unitLabel,
    ...(vatCode ? { vatCode } : {}),
  })

  revalidateTag(TAGS.products, 'default')
  revalidatePath('/inventory')
  revalidatePath('/dashboard')
  invalidateDashboard(store.id)
}

export async function archiveProductAction(productId: string) {
  const { supabase, store } = await getContext()
  const productRepo = new ProductRepository(supabase)

  await productRepo.archive(store.id, productId)

  revalidateTag(TAGS.products, 'default')
  revalidatePath('/inventory')
  revalidatePath('/dashboard')
  invalidateDashboard(store.id)
}

export interface CsvImportResult {
  imported: number
  skipped: number
  errors: { line: number; message: string }[]
}

export async function bulkImportProductsAction(csv: string): Promise<CsvImportResult> {
  const { supabase, store } = await getContext()
  const productRepo = new ProductRepository(supabase)
  const alertRepo = new AlertRepository(supabase)

  const parsed = parseProductCsv(csv)
  let imported = 0
  let skipped = 0

  for (const row of parsed.rows) {
    try {
      await addProduct(productRepo, alertRepo, store.id, {
        name: row.name,
        price: row.price,
        cost: row.cost,
        qty: row.qty,
        reorderPoint: row.reorderPoint,
        sku: row.sku ?? undefined,
      })
      imported++
    } catch {
      skipped++
    }
  }

  revalidateTag(TAGS.products, 'default')
  revalidatePath('/inventory')
  revalidatePath('/dashboard')
  invalidateDashboard(store.id)

  return { imported, skipped, errors: parsed.errors }
}

export async function recordWasteAction(formData: FormData) {
  const { supabase, store } = await getContext()
  const productRepo = new ProductRepository(supabase)
  const wastageRepo = new WastageRepository(supabase)
  const alertRepo = new AlertRepository(supabase)

  await recordWastage(productRepo, wastageRepo, alertRepo, store.id, {
    productId: formData.get('productId') as string,
    qty: parseFloat(formData.get('qty') as string) || 0,
    reason: ((formData.get('reason') as string) || 'other') as WastageReason,
    notes: ((formData.get('notes') as string) || '').trim() || undefined,
  })

  revalidateTag(TAGS.products, 'default')
  revalidatePath('/inventory')
  revalidatePath('/dashboard')
  invalidateDashboard(store.id)
}
