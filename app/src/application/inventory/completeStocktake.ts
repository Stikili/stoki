import { IProductRepository } from '@/domain/repositories/IProductRepository'
import { IStocktakeRepository } from '@/domain/repositories/IStocktakeRepository'
import { Stocktake } from '@/domain/entities/stocktake'

export interface CompleteStocktakeInput {
  /** Map of productId → counted physical qty. Products absent from the map are skipped. */
  counts: Record<string, number>
  notes?: string
}

/**
 * Complete a stocktake: read system qty for each counted product, persist a
 * stocktake header + lines, then adjust product.qty to match counted_qty.
 *
 * Variance = counted - system. Cost per unit is captured at the moment of
 * count so later cost changes don't rewrite the audit trail.
 */
export async function completeStocktake(
  productRepo: IProductRepository,
  stocktakeRepo: IStocktakeRepository,
  storeId: string,
  performedBy: string | null,
  input: CompleteStocktakeInput,
): Promise<Stocktake> {
  const productIds = Object.keys(input.counts)
  if (productIds.length === 0) {
    throw new Error('Stocktake must include at least one counted product')
  }

  const products = await productRepo.findAll(storeId)
  const productById = new Map(products.map((p) => [p.id, p]))

  const lines = productIds.map((productId) => {
    const product = productById.get(productId)
    if (!product) {
      throw new Error(`Product ${productId} not found in store`)
    }
    const counted = input.counts[productId]
    if (!Number.isInteger(counted) || counted < 0) {
      throw new Error(`Counted qty for ${product.name} must be a non-negative integer`)
    }
    return {
      productId,
      systemQty: product.qty,
      countedQty: counted,
      costPerUnit: product.cost,
    }
  })

  const stocktake = await stocktakeRepo.create(storeId, performedBy, {
    notes: input.notes,
    lines,
  })

  // Apply variance to product qty. updateQty takes a delta; variance is the
  // signed difference (counted - system) so this drives the live qty to match.
  for (const line of stocktake.lines) {
    if (line.variance !== 0 && line.productId) {
      await productRepo.updateQty(storeId, line.productId, line.variance)
    }
  }

  return stocktake
}
