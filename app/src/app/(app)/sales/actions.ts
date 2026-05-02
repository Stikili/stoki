'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { TAGS } from '@/lib/cache-tags'
import { createClient } from '@/infrastructure/supabase/server'
import { redirect } from 'next/navigation'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import { ProductRepository } from '@/infrastructure/supabase/repositories/ProductRepository'
import { AlertRepository } from '@/infrastructure/supabase/repositories/AlertRepository'
import { recordSale } from '@/application/sales/recordSale'
import { PaymentMethod } from '@/domain/entities/sale'

export async function recordSaleAction(
  productId: string,
  qty: number,
  priceAtSale: number,
  paymentMethod: PaymentMethod = 'cash',
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const storeRepo = new StoreRepository(supabase)
  const store = await storeRepo.getByOwnerId(user.id)
  if (!store) redirect('/login')

  const saleRepo = new SaleRepository(supabase)
  const productRepo = new ProductRepository(supabase)
  const alertRepo = new AlertRepository(supabase)

  await recordSale(saleRepo, productRepo, alertRepo, store, {
    productId,
    qty,
    priceAtSale,
    channel: 'app',
    paymentMethod,
  })

  revalidateTag(TAGS.products, 'default')
  revalidatePath('/sales')
  revalidatePath('/dashboard')
  revalidatePath('/alerts')
  revalidatePath('/cashup')
}

export async function recordCartAction(
  items: { productId: string; qty: number; priceAtSale: number }[],
  paymentMethod: PaymentMethod = 'cash',
): Promise<{ invoiceNumber: number | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const storeRepo = new StoreRepository(supabase)
  const store = await storeRepo.getByOwnerId(user.id)
  if (!store) redirect('/login')

  const saleRepo = new SaleRepository(supabase)
  const productRepo = new ProductRepository(supabase)
  const alertRepo = new AlertRepository(supabase)

  // One invoice number per cart, shared across all line items.
  const invoiceNumber = store.vatRegistered
    ? await saleRepo.claimInvoiceNumber(store.id)
    : null

  for (const item of items) {
    await recordSale(saleRepo, productRepo, alertRepo, store, {
      productId: item.productId,
      qty: item.qty,
      priceAtSale: item.priceAtSale,
      channel: 'app',
      paymentMethod,
      invoiceNumber,
    })
  }

  revalidateTag(TAGS.products, 'default')
  revalidatePath('/sales')
  revalidatePath('/dashboard')
  revalidatePath('/alerts')
  revalidatePath('/cashup')

  return { invoiceNumber }
}

export async function recordReturnAction(
  saleId: string,
  paymentMethod: PaymentMethod = 'cash',
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const storeRepo = new StoreRepository(supabase)
  const store = await storeRepo.getByOwnerId(user.id)
  if (!store) redirect('/login')

  const saleRepo = new SaleRepository(supabase)
  const productRepo = new ProductRepository(supabase)
  const alertRepo = new AlertRepository(supabase)

  // Look up the original sale and validate. Prevents over-returning (refunding
  // qty 5 against a sale of qty 2) which would create phantom stock.
  const sale = await saleRepo.findById(store.id, saleId)
  if (!sale) return { ok: false, error: 'Sale not found' }
  if (sale.type === 'return') return { ok: false, error: 'Cannot return a return.' }
  if (!sale.productId) return { ok: false, error: 'This sale has no linked product to return.' }

  await recordSale(saleRepo, productRepo, alertRepo, store, {
    productId: sale.productId,
    qty: sale.qty,
    priceAtSale: sale.priceAtSale,
    type: 'return',
    channel: 'app',
    paymentMethod,
  })

  revalidateTag(TAGS.products, 'default')
  revalidatePath('/sales')
  revalidatePath('/dashboard')
  revalidatePath('/cashup')
  return { ok: true }
}

export async function getSalesByDateAction(from: string, to: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const storeRepo = new StoreRepository(supabase)
  const store = await storeRepo.getByOwnerId(user.id)
  if (!store) return []

  const saleRepo = new SaleRepository(supabase)
  return saleRepo.findByPeriod(store.id, new Date(from), new Date(to))
}
