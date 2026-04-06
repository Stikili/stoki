import { Sale, NewSale } from '@/domain/entities/sale'
import { ISaleRepository } from '@/domain/repositories/ISaleRepository'
import { IProductRepository } from '@/domain/repositories/IProductRepository'
import { IAlertRepository } from '@/domain/repositories/IAlertRepository'

export async function recordSale(
  saleRepo: ISaleRepository,
  productRepo: IProductRepository,
  alertRepo: IAlertRepository,
  storeId: string,
  data: NewSale
): Promise<Sale> {
  // Look up product cost for profit tracking
  const productForCost = await productRepo.findById(storeId, data.productId)
  const saleData = { ...data, costAtSale: data.costAtSale ?? productForCost?.cost ?? 0 }

  const sale = await saleRepo.record(storeId, saleData)

  // Decrement stock (or increment for returns)
  const qtyDelta = data.type === 'return' ? data.qty : -data.qty
  await productRepo.updateQty(storeId, data.productId, qtyDelta)

  // Check if reorder alert needed
  const product = await productRepo.findById(storeId, data.productId)
  if (product) {
    if (product.qty <= 0) {
      await alertRepo.create(storeId, 'out_of_stock', `${product.name} is now out of stock.`)
    } else if (product.qty <= product.reorderPoint) {
      await alertRepo.create(
        storeId,
        'low_stock',
        `${product.name} is running low — only ${product.qty} left.`
      )
    }
  }

  return sale
}
