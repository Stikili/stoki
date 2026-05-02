import { describe, expect, it } from 'vitest'
import { recordWastage } from './recordWastage'
import { Wastage, NewWastage, WastageReason } from '@/domain/entities/wastage'
import { Product, NewProduct } from '@/domain/entities/product'
import { Alert, AlertType } from '@/domain/entities/alert'
import { IProductRepository } from '@/domain/repositories/IProductRepository'
import { IWastageRepository } from '@/domain/repositories/IWastageRepository'
import { IAlertRepository } from '@/domain/repositories/IAlertRepository'

class FakeProductRepo implements IProductRepository {
  products = new Map<string, Product>()
  async findAll(): Promise<Product[]> { return [...this.products.values()] }
  async findById(_storeId: string, productId: string): Promise<Product | null> {
    return this.products.get(productId) ?? null
  }
  async create(): Promise<Product> { throw new Error('not used') }
  async update(_storeId: string, productId: string, data: Partial<NewProduct>): Promise<Product> {
    const p = this.products.get(productId)!
    const updated: Product = { ...p, ...data, vatInclusive: data.vatInclusive ?? p.vatInclusive }
    this.products.set(productId, updated)
    return updated
  }
  async updateQty(_storeId: string, productId: string, delta: number): Promise<void> {
    const p = this.products.get(productId)!
    this.products.set(productId, { ...p, qty: p.qty + delta })
  }
  async archive(): Promise<void> {}
  async setVatInclusiveAll(): Promise<number> { return 0 }
}

class FakeWastageRepo implements IWastageRepository {
  records: Wastage[] = []
  async record(storeId: string, data: NewWastage & { costAtLoss: number }): Promise<Wastage> {
    const r: Wastage = {
      id: `w-${this.records.length + 1}`,
      storeId,
      productId: data.productId,
      productName: null,
      qty: data.qty,
      costAtLoss: data.costAtLoss,
      reason: (data.reason ?? 'other') as WastageReason,
      notes: data.notes ?? null,
      recordedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }
    this.records.push(r)
    return r
  }
  async findByPeriod(): Promise<Wastage[]> { return [] }
}

class FakeAlertRepo implements IAlertRepository {
  created: { type: AlertType; message: string }[] = []
  async findAll(): Promise<Alert[]> { return [] }
  async findUnread(): Promise<Alert[]> { return [] }
  async create(_storeId: string, type: AlertType, message: string): Promise<Alert> {
    this.created.push({ type, message })
    return { id: 'a', storeId: 's1', type, message, readAt: null, actionTakenAt: null, createdAt: '' }
  }
  async markRead(): Promise<void> {}
  async markAllRead(): Promise<void> {}
  async markActionTaken(): Promise<void> {}
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    storeId: 's1',
    name: 'Bread',
    price: 23,
    cost: 15,
    qty: 10,
    reorderPoint: 5,
    sku: null,
    photoUrl: null,
    expiryDate: null,
    vatInclusive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('recordWastage', () => {
  it('records the wastage event with cost captured from product', async () => {
    const productRepo = new FakeProductRepo()
    const wastageRepo = new FakeWastageRepo()
    const alertRepo = new FakeAlertRepo()
    productRepo.products.set('p1', makeProduct({ cost: 12, qty: 10 }))

    await recordWastage(productRepo, wastageRepo, alertRepo, 's1', {
      productId: 'p1',
      qty: 3,
      reason: 'expired',
    })

    expect(wastageRepo.records).toHaveLength(1)
    expect(wastageRepo.records[0]).toMatchObject({
      qty: 3,
      reason: 'expired',
      costAtLoss: 12,
    })
  })

  it('decrements product stock by the wastage qty', async () => {
    const productRepo = new FakeProductRepo()
    const wastageRepo = new FakeWastageRepo()
    const alertRepo = new FakeAlertRepo()
    productRepo.products.set('p1', makeProduct({ qty: 10 }))

    await recordWastage(productRepo, wastageRepo, alertRepo, 's1', {
      productId: 'p1',
      qty: 4,
    })

    expect(productRepo.products.get('p1')!.qty).toBe(6)
  })

  it('throws if qty is zero or negative', async () => {
    const productRepo = new FakeProductRepo()
    const wastageRepo = new FakeWastageRepo()
    const alertRepo = new FakeAlertRepo()
    productRepo.products.set('p1', makeProduct())

    await expect(
      recordWastage(productRepo, wastageRepo, alertRepo, 's1', { productId: 'p1', qty: 0 }),
    ).rejects.toThrow(/positive/)
    await expect(
      recordWastage(productRepo, wastageRepo, alertRepo, 's1', { productId: 'p1', qty: -1 }),
    ).rejects.toThrow(/positive/)
  })

  it('throws if wastage qty exceeds available stock', async () => {
    const productRepo = new FakeProductRepo()
    const wastageRepo = new FakeWastageRepo()
    const alertRepo = new FakeAlertRepo()
    productRepo.products.set('p1', makeProduct({ qty: 3 }))

    await expect(
      recordWastage(productRepo, wastageRepo, alertRepo, 's1', { productId: 'p1', qty: 5 }),
    ).rejects.toThrow(/Only 3 Bread in stock/)
    expect(wastageRepo.records).toEqual([])
  })

  it('throws if product does not exist', async () => {
    const productRepo = new FakeProductRepo()
    const wastageRepo = new FakeWastageRepo()
    const alertRepo = new FakeAlertRepo()

    await expect(
      recordWastage(productRepo, wastageRepo, alertRepo, 's1', { productId: 'missing', qty: 1 }),
    ).rejects.toThrow('Product not found')
  })

  it('emits an out-of-stock alert when wastage empties stock', async () => {
    const productRepo = new FakeProductRepo()
    const wastageRepo = new FakeWastageRepo()
    const alertRepo = new FakeAlertRepo()
    productRepo.products.set('p1', makeProduct({ qty: 3, reorderPoint: 5 }))

    await recordWastage(productRepo, wastageRepo, alertRepo, 's1', {
      productId: 'p1',
      qty: 3,
    })

    expect(alertRepo.created).toContainEqual({
      type: 'out_of_stock',
      message: 'Bread is now out of stock (recorded as waste).',
    })
  })

  it('emits a low-stock alert when wastage drops qty to reorder point', async () => {
    const productRepo = new FakeProductRepo()
    const wastageRepo = new FakeWastageRepo()
    const alertRepo = new FakeAlertRepo()
    productRepo.products.set('p1', makeProduct({ qty: 8, reorderPoint: 5 }))

    await recordWastage(productRepo, wastageRepo, alertRepo, 's1', {
      productId: 'p1',
      qty: 3,
    })

    expect(alertRepo.created).toContainEqual({
      type: 'low_stock',
      message: 'Bread is running low — 5 left after waste.',
    })
  })
})
