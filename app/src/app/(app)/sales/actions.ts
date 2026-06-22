'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { TAGS , invalidateDashboard } from '@/lib/cache-tags'
import { createClient } from '@/infrastructure/supabase/server'
import { redirect } from 'next/navigation'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import { ProductRepository } from '@/infrastructure/supabase/repositories/ProductRepository'
import { AlertRepository } from '@/infrastructure/supabase/repositories/AlertRepository'
import { AirtimePinRepository } from '@/infrastructure/supabase/repositories/AirtimePinRepository'
import { BundleComponentRepository } from '@/infrastructure/supabase/repositories/BundleComponentRepository'
import { recordBundleSale } from '@/application/sales/recordBundleSale'
import { dispenseAirtimePin, checkAirtimeAvailability } from '@/application/airtime/dispenseAirtimePin'
import { PaymentMethod } from '@/domain/entities/sale'

export interface DispensedPin {
  productId: string
  productName: string
  pin: string
  serial: string | null
}

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
  const bundleRepo = new BundleComponentRepository(supabase)

  await recordBundleSale(saleRepo, productRepo, bundleRepo, alertRepo, store, {
    productId,
    qty,
    priceAtSale,
    channel: 'app',
    paymentMethod,
  })

  revalidateTag(TAGS.products, 'default')
  revalidatePath('/sales')
  revalidatePath('/dashboard')
  invalidateDashboard()
  revalidatePath('/alerts')
  revalidatePath('/cashup')
}

/** Cart line — either a real product (productId set) or a manual / off-book
 *  item (productId null, productName provided). The action treats both
 *  uniformly downstream; only airtime + stock-decrement live in the
 *  product-linked branch. */
export interface CartLine {
  productId: string | null
  productName?: string
  qty: number
  priceAtSale: number
}

export async function recordCartAction(
  items: CartLine[],
  paymentMethod: PaymentMethod = 'cash',
): Promise<{ invoiceNumber: number | null; dispensedPins: DispensedPin[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const storeRepo = new StoreRepository(supabase)
  const store = await storeRepo.getByOwnerId(user.id)
  if (!store) redirect('/login')

  const saleRepo = new SaleRepository(supabase)
  const productRepo = new ProductRepository(supabase)
  const alertRepo = new AlertRepository(supabase)
  const pinRepo = new AirtimePinRepository(supabase)
  const bundleRepo = new BundleComponentRepository(supabase)

  // Pre-flight: refuse the entire cart if airtime stock can't cover it.
  // Manual lines (productId null) skip this check entirely — they're not
  // products and have no stock to consume.
  // Better to fail fast than to record a partial sale + half-dispense PINs.
  const productLinkedItems = items
    .filter((i): i is CartLine & { productId: string } => i.productId !== null)
    .map((i) => ({ productId: i.productId, qty: i.qty }))
  const shortages = await checkAirtimeAvailability(productRepo, pinRepo, store.id, productLinkedItems)
  if (shortages.length > 0) {
    const msg = shortages
      .map((s) => `${s.productName}: ${s.requested} requested, ${s.available} in stock`)
      .join('; ')
    return { invoiceNumber: null, dispensedPins: [], error: `Airtime sold out — ${msg}` }
  }

  // One invoice number per cart, shared across all line items.
  const invoiceNumber = store.vatRegistered
    ? await saleRepo.claimInvoiceNumber(store.id)
    : null

  const dispensedPins: DispensedPin[] = []
  for (const item of items) {
    // recordBundleSale handles both bundles (decomposes to components) and
    // plain products (delegates to recordSale) — single entry point keeps
    // the cart loop simple.
    const sale = await recordBundleSale(saleRepo, productRepo, bundleRepo, alertRepo, store, {
      productId: item.productId,
      productName: item.productName,
      qty: item.qty,
      priceAtSale: item.priceAtSale,
      channel: 'app',
      paymentMethod,
      invoiceNumber,
    })

    // Airtime + PIN dispensing only applies to product-linked lines —
    // manual / off-book sales never have airtime PINs to pop.
    if (!item.productId) continue

    // Airtime products dispense one PIN per qty unit (a "qty 3" cart line
    // hands the customer 3 separate vouchers).
    const product = await productRepo.findById(store.id, item.productId)
    if (product?.isAirtime) {
      for (let i = 0; i < item.qty; i++) {
        const pin = await dispenseAirtimePin(productRepo, pinRepo, store.id, item.productId, sale.id)
        if (pin) {
          dispensedPins.push({
            productId: product.id,
            productName: product.name,
            pin: pin.pin,
            serial: pin.serial,
          })
        }
      }
    }
  }

  revalidateTag(TAGS.products, 'default')
  revalidatePath('/sales')
  revalidatePath('/dashboard')
  invalidateDashboard()
  revalidatePath('/alerts')
  revalidatePath('/cashup')
  revalidatePath('/airtime')

  return { invoiceNumber, dispensedPins }
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
  const bundleRepo = new BundleComponentRepository(supabase)

  // Look up the original sale and validate. Prevents over-returning (refunding
  // qty 5 against a sale of qty 2) which would create phantom stock.
  const sale = await saleRepo.findById(store.id, saleId)
  if (!sale) return { ok: false, error: 'Sale not found' }
  if (sale.type === 'return') return { ok: false, error: 'Cannot return a return.' }
  if (!sale.productId) return { ok: false, error: 'This sale has no linked product to return.' }

  await recordBundleSale(saleRepo, productRepo, bundleRepo, alertRepo, store, {
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
  invalidateDashboard()
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
