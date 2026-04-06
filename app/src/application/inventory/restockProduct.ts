import { IProductRepository } from '@/domain/repositories/IProductRepository'
import { IAlertRepository } from '@/domain/repositories/IAlertRepository'

export async function restockProduct(
  productRepo: IProductRepository,
  alertRepo: IAlertRepository,
  storeId: string,
  productId: string,
  qtyAdded: number
): Promise<void> {
  await productRepo.updateQty(storeId, productId, qtyAdded)

  const product = await productRepo.findById(storeId, productId)
  if (!product) return

  // Clear out-of-stock alert if now back in stock
  if (product.qty > product.reorderPoint) {
    await alertRepo.create(
      storeId,
      'ai_insight',
      `${product.name} restocked to ${product.qty} units.`
    )
  }
}
