import { Product, NewProduct } from '../entities/product'

export interface IProductRepository {
  findAll(storeId: string): Promise<Product[]>
  findById(storeId: string, productId: string): Promise<Product | null>
  create(storeId: string, data: NewProduct): Promise<Product>
  update(storeId: string, productId: string, data: Partial<NewProduct>): Promise<Product>
  updateQty(storeId: string, productId: string, delta: number): Promise<void>
  archive(storeId: string, productId: string): Promise<void>
  /** Bulk-set vat_inclusive across every active product. Returns row count updated. */
  setVatInclusiveAll(storeId: string, vatInclusive: boolean): Promise<number>
}
