import { SupabaseClient } from '@supabase/supabase-js'
import { IProductRepository } from '@/domain/repositories/IProductRepository'
import { Product, NewProduct } from '@/domain/entities/product'
import { toProduct } from '../mappers'

export class ProductRepository implements IProductRepository {
  constructor(private db: SupabaseClient) {}

  async findAll(storeId: string): Promise<Product[]> {
    const { data, error } = await this.db
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .order('name')

    if (error) throw new Error(error.message)
    return (data ?? []).map(toProduct)
  }

  async findById(storeId: string, productId: string): Promise<Product | null> {
    const { data, error } = await this.db
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .eq('id', productId)
      .is('deleted_at', null)
      .single()

    if (error || !data) return null
    return toProduct(data)
  }

  async create(storeId: string, data: NewProduct): Promise<Product> {
    const { data: row, error } = await this.db
      .from('products')
      .insert({
        store_id: storeId,
        name: data.name,
        price: data.price,
        cost: data.cost,
        qty: data.qty,
        reorder_point: data.reorderPoint,
        sku: data.sku ?? null,
        vat_inclusive: data.vatInclusive ?? true,
        is_airtime: data.isAirtime ?? false,
      })
      .select()
      .single()

    if (error || !row) throw new Error(error?.message ?? 'Failed to create product')
    return toProduct(row)
  }

  async update(storeId: string, productId: string, data: Partial<NewProduct>): Promise<Product> {
    const patch: Record<string, unknown> = {}
    if (data.name !== undefined) patch.name = data.name
    if (data.price !== undefined) patch.price = data.price
    if (data.cost !== undefined) patch.cost = data.cost
    if (data.qty !== undefined) patch.qty = data.qty
    if (data.reorderPoint !== undefined) patch.reorder_point = data.reorderPoint
    if (data.sku !== undefined) patch.sku = data.sku
    if (data.expiryDate !== undefined) patch.expiry_date = data.expiryDate || null
    if (data.vatInclusive !== undefined) patch.vat_inclusive = data.vatInclusive
    if (data.isAirtime !== undefined) patch.is_airtime = data.isAirtime

    const { data: row, error } = await this.db
      .from('products')
      .update(patch)
      .eq('store_id', storeId)
      .eq('id', productId)
      .select()
      .single()

    if (error || !row) throw new Error(error?.message ?? 'Failed to update product')
    return toProduct(row)
  }

  async updateQty(storeId: string, productId: string, delta: number): Promise<void> {
    const { error } = await this.db.rpc('increment_product_qty', {
      p_store_id: storeId,
      p_product_id: productId,
      p_delta: delta,
    })
    if (error) throw new Error(error.message)
  }

  async archive(storeId: string, productId: string): Promise<void> {
    const { error } = await this.db
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('store_id', storeId)
      .eq('id', productId)

    if (error) throw new Error(error.message)
  }

  async setVatInclusiveAll(storeId: string, vatInclusive: boolean): Promise<number> {
    const { data, error } = await this.db
      .from('products')
      .update({ vat_inclusive: vatInclusive })
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .select('id')
    if (error) throw new Error(error.message)
    return (data ?? []).length
  }
}
