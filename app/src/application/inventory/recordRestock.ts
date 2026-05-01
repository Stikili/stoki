import { IProductRepository } from '@/domain/repositories/IProductRepository'
import { IRestockRepository } from '@/domain/repositories/IRestockRepository'
import { IAlertRepository } from '@/domain/repositories/IAlertRepository'
import { Restock, NewRestock } from '@/domain/entities/restock'

// Records a restock event AND bumps product qty.
// If `cost` is provided, also updates the product's unit cost using a weighted
// average against the current stock, so margin calculations stay accurate.
export async function recordRestock(
  productRepo: IProductRepository,
  restockRepo: IRestockRepository,
  alertRepo: IAlertRepository,
  storeId: string,
  data: NewRestock,
): Promise<Restock> {
  const product = await productRepo.findById(storeId, data.productId)
  if (!product) throw new Error('Product not found')

  const restock = await restockRepo.record(storeId, data)
  await productRepo.updateQty(storeId, data.productId, data.qtyAdded)

  if (data.cost !== undefined && data.cost > 0) {
    const currentQty = Math.max(product.qty, 0)
    const currentValue = currentQty * product.cost
    const newValue = data.qtyAdded * data.cost
    const totalQty = currentQty + data.qtyAdded
    const newAvgCost = totalQty > 0 ? (currentValue + newValue) / totalQty : data.cost
    await productRepo.update(storeId, data.productId, { cost: Number(newAvgCost.toFixed(2)) })
  }

  // Surface a positive insight if we just brought something out of stock back online.
  if (product.qty <= 0 && data.qtyAdded > 0) {
    await alertRepo.create(
      storeId,
      'ai_insight',
      `${product.name} restocked — ${data.qtyAdded} units added.`,
    )
  }

  return restock
}
