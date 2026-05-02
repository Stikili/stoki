import { Sale, NewSale } from '@/domain/entities/sale'
import { Store } from '@/domain/entities/store'
import { ISaleRepository } from '@/domain/repositories/ISaleRepository'
import { IProductRepository } from '@/domain/repositories/IProductRepository'
import { IAlertRepository } from '@/domain/repositories/IAlertRepository'
import { IBundleComponentRepository } from '@/domain/repositories/IBundleComponentRepository'
import { computeVat } from '@/lib/vat'
import { recordSale } from './recordSale'

/**
 * Record a sale that may be a bundle.
 *
 * For piece-good products this just delegates to `recordSale`. For bundles
 * (`product.isBundle`), the sale row itself records the bundle (so receipts
 * and revenue stay clean), but stock decrements come from the bundle's
 * components — never from the bundle product itself, which has no stock of
 * its own. Cost-at-sale is the sum of component costs at that moment.
 */
export async function recordBundleSale(
  saleRepo: ISaleRepository,
  productRepo: IProductRepository,
  bundleRepo: IBundleComponentRepository,
  alertRepo: IAlertRepository,
  store: Store,
  data: NewSale,
): Promise<Sale> {
  const product = await productRepo.findById(store.id, data.productId)
  if (!product) throw new Error('Product not found')
  if (!product.isBundle) {
    // Plain product — let the existing pipeline do its thing.
    return recordSale(saleRepo, productRepo, alertRepo, store, data)
  }

  // Bundle path — pre-flight component stock and cost.
  const components = await bundleRepo.findByBundle(store.id, data.productId)
  if (components.length === 0) {
    throw new Error(`Bundle "${product.name}" has no components defined yet — set them in inventory first`)
  }

  // Refuse to sell if any component would go negative.
  for (const c of components) {
    if (c.componentQty == null) continue
    const needed = c.qty * data.qty
    if (c.componentQty < needed) {
      throw new Error(
        `Not enough stock for bundle "${product.name}" — short ${needed - c.componentQty} of ${c.componentName ?? 'component'}`,
      )
    }
  }

  // Cost-at-sale = sum of component qty × cost. Caller can override (rare).
  const componentCost = components.reduce(
    (sum, c) => sum + c.qty * (c.componentCost ?? 0),
    0,
  )
  const costAtSale = data.costAtSale ?? componentCost

  // VAT calc unchanged — bundle's own price + vatInclusive flag drive it.
  const breakdown = computeVat(
    data.priceAtSale,
    data.qty,
    store.vatRegistered,
    product.vatInclusive,
    store.vatRate,
  )

  const invoiceNumber = data.invoiceNumber !== undefined
    ? data.invoiceNumber
    : store.vatRegistered
      ? await saleRepo.claimInvoiceNumber(store.id)
      : null

  const sale = await saleRepo.record(store.id, {
    ...data,
    costAtSale,
    vatAmount: breakdown.vat,
    invoiceNumber,
  })

  // Decrement each component (return = increment). Records flow through
  // updateQty so wastage / low-stock alerts fire correctly per component.
  const sign = data.type === 'return' ? +1 : -1
  for (const c of components) {
    const delta = sign * c.qty * data.qty
    await productRepo.updateQty(store.id, c.componentId, delta)

    const after = await productRepo.findById(store.id, c.componentId)
    if (after && data.type !== 'return') {
      if (after.qty <= 0) {
        await alertRepo.create(store.id, 'out_of_stock', `${after.name} is out of stock (sold via bundle).`)
      } else if (after.qty <= after.reorderPoint) {
        await alertRepo.create(store.id, 'low_stock', `${after.name} is running low — ${after.qty} left.`)
      }
    }
  }

  return sale
}
