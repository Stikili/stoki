import { Product, NewProduct } from '@/domain/entities/product'
import { IProductRepository } from '@/domain/repositories/IProductRepository'
import { IAlertRepository } from '@/domain/repositories/IAlertRepository'

export async function addProduct(
  productRepo: IProductRepository,
  alertRepo: IAlertRepository,
  storeId: string,
  data: NewProduct
): Promise<Product> {
  const product = await productRepo.create(storeId, data)

  if (product.qty <= 0) {
    await alertRepo.create(storeId, 'out_of_stock', `${product.name} was added with 0 stock.`)
  } else if (product.qty <= product.reorderPoint) {
    await alertRepo.create(storeId, 'low_stock', `${product.name} is already low on stock (${product.qty} left).`)
  }

  return product
}
