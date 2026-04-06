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
  const sale = await saleRepo.record(storeId, data)

  // Decrement stock
  await productRepo.updateQty(storeId, data.productId, -data.qty)

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
