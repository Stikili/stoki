import { ProductWithStatus, withStatus } from '@/domain/entities/product'
import { IProductRepository } from '@/domain/repositories/IProductRepository'

export async function getProducts(
  repo: IProductRepository,
  storeId: string
): Promise<ProductWithStatus[]> {
  const products = await repo.findAll(storeId)
  return products.map(withStatus)
}
