import { IProductRepository } from '@/domain/repositories/IProductRepository'
import { IWastageRepository } from '@/domain/repositories/IWastageRepository'
import { IAlertRepository } from '@/domain/repositories/IAlertRepository'
import { Wastage, NewWastage } from '@/domain/entities/wastage'

/**
 * Record a stock loss event (expired, damaged, theft, etc.).
 * Decrements stock and captures cost-at-loss so wastage can be valued in
 * P&L reports. Emits a low/out-of-stock alert if the loss empties stock.
 */
export async function recordWastage(
  productRepo: IProductRepository,
  wastageRepo: IWastageRepository,
  alertRepo: IAlertRepository,
  storeId: string,
  data: NewWastage,
): Promise<Wastage> {
  if (data.qty <= 0) throw new Error('Wastage qty must be positive')

  const product = await productRepo.findById(storeId, data.productId)
  if (!product) throw new Error('Product not found')
  if (product.qty < data.qty) {
    throw new Error(`Only ${product.qty} ${product.name} in stock — cannot record ${data.qty} as waste`)
  }

  const costAtLoss = product.cost
  const record = await wastageRepo.record(storeId, { ...data, costAtLoss })
  await productRepo.updateQty(storeId, data.productId, -data.qty)

  const after = await productRepo.findById(storeId, data.productId)
  if (after) {
    if (after.qty <= 0) {
      await alertRepo.create(storeId, 'out_of_stock', `${after.name} is now out of stock (recorded as waste).`)
    } else if (after.qty <= after.reorderPoint) {
      await alertRepo.create(
        storeId,
        'low_stock',
        `${after.name} is running low — ${after.qty} left after waste.`,
      )
    }
  }

  return record
}
