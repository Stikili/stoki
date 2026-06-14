import { Sale, NewSale } from '@/domain/entities/sale'
import { Store } from '@/domain/entities/store'
import { ISaleRepository } from '@/domain/repositories/ISaleRepository'
import { IProductRepository } from '@/domain/repositories/IProductRepository'
import { IAlertRepository } from '@/domain/repositories/IAlertRepository'
import { computeVat } from '@/lib/vat'

export async function recordSale(
  saleRepo: ISaleRepository,
  productRepo: IProductRepository,
  alertRepo: IAlertRepository,
  store: Store,
  data: NewSale,
): Promise<Sale> {
  // Manual / off-book sale: no product to look up, no stock to decrement,
  // no low/out-of-stock alerts to fire. Cost defaults to 0 unless caller
  // supplied one. VAT defaults to inclusive (the SA retail standard).
  const product = data.productId
    ? await productRepo.findById(store.id, data.productId)
    : null
  const cost = data.costAtSale ?? product?.cost ?? 0

  // VAT calc — only when the store is VAT-registered. Zero-rated / exempt
  // products contribute revenue but no output VAT — the VAT201 worksheet
  // splits these into separate blocks via the snapshotted `vatCode`.
  const productVatCode = product?.vatCode ?? 'standard'
  const chargeVat = store.vatRegistered && productVatCode === 'standard'
  const breakdown = computeVat(
    data.priceAtSale,
    data.qty,
    chargeVat,
    product?.vatInclusive ?? true,
    store.vatRate,
  )

  // Claim an invoice number for VAT-registered stores so receipts are SARS-sequential.
  // If the caller already supplied one (e.g. a cart sharing one number across line items)
  // we honour it instead of claiming a fresh one. Returns are still numbered (credit-note event).
  const invoiceNumber = data.invoiceNumber !== undefined
    ? data.invoiceNumber
    : store.vatRegistered
      ? await saleRepo.claimInvoiceNumber(store.id)
      : null

  const sale = await saleRepo.record(store.id, {
    ...data,
    costAtSale: cost,
    vatAmount: breakdown.vat,
    vatCode: store.vatRegistered ? productVatCode : null,
    invoiceNumber,
  })

  // Stock decrement + low/out alerts only run when the sale is product-linked.
  if (data.productId) {
    const qtyDelta = data.type === 'return' ? data.qty : -data.qty
    await productRepo.updateQty(store.id, data.productId, qtyDelta)

    const after = await productRepo.findById(store.id, data.productId)
    if (after) {
      if (after.qty <= 0) {
        await alertRepo.create(store.id, 'out_of_stock', `${after.name} is now out of stock.`)
      } else if (after.qty <= after.reorderPoint) {
        await alertRepo.create(
          store.id,
          'low_stock',
          `${after.name} is running low — only ${after.qty} left.`,
        )
      }
    }
  }

  return sale
}
