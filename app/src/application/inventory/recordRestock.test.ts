import { describe, expect, it } from 'vitest'
import { recordRestock } from './recordRestock'
import { Restock, NewRestock } from '@/domain/entities/restock'
import { Product, NewProduct } from '@/domain/entities/product'
import { Alert, AlertType } from '@/domain/entities/alert'
import { IProductRepository } from '@/domain/repositories/IProductRepository'
import { IRestockRepository } from '@/domain/repositories/IRestockRepository'
import { IAlertRepository } from '@/domain/repositories/IAlertRepository'

class FakeProductRepo implements IProductRepository {
  products: Map<string, Product> = new Map()
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

class FakeRestockRepo implements IRestockRepository {
  records: Restock[] = []
  async record(storeId: string, data: NewRestock): Promise<Restock> {
    const r: Restock = {
      id: `r-${this.records.length + 1}`,
      storeId,
      productId: data.productId,
      productName: null,
      qtyAdded: data.qtyAdded,
      cost: data.cost ?? null,
      supplierId: data.supplierId ?? null,
      supplierName: null,
      notes: data.notes ?? null,
      recordedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }
    this.records.push(r)
    return r
  }
  async findByPeriod(): Promise<Restock[]> { return [] }
  async findByProduct(): Promise<Restock[]> { return [] }
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
    isAirtime: false,
    isBundle: false,
    isWeighable: false,
    unitLabel: 'each',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('recordRestock', () => {
  it('records the restock and bumps product qty', async () => {
    const productRepo = new FakeProductRepo()
    const restockRepo = new FakeRestockRepo()
    const alertRepo = new FakeAlertRepo()
    productRepo.products.set('p1', makeProduct({ qty: 10 }))

    await recordRestock(productRepo, restockRepo, alertRepo, 's1', {
      productId: 'p1',
      qtyAdded: 20,
    })

    expect(restockRepo.records).toHaveLength(1)
    expect(restockRepo.records[0].qtyAdded).toBe(20)
    expect(productRepo.products.get('p1')!.qty).toBe(30)
  })

  it('does NOT update unit cost when no cost is provided', async () => {
    const productRepo = new FakeProductRepo()
    const restockRepo = new FakeRestockRepo()
    const alertRepo = new FakeAlertRepo()
    productRepo.products.set('p1', makeProduct({ cost: 15 }))

    await recordRestock(productRepo, restockRepo, alertRepo, 's1', {
      productId: 'p1',
      qtyAdded: 20,
    })

    expect(productRepo.products.get('p1')!.cost).toBe(15)
  })

  it('updates unit cost using a weighted average against current stock', async () => {
    const productRepo = new FakeProductRepo()
    const restockRepo = new FakeRestockRepo()
    const alertRepo = new FakeAlertRepo()
    // Current: 10 units @ R10  → R100 of stock value
    // Restock: 10 units @ R20  → R200 added
    // Average: (R100 + R200) / 20 units = R15
    productRepo.products.set('p1', makeProduct({ qty: 10, cost: 10 }))

    await recordRestock(productRepo, restockRepo, alertRepo, 's1', {
      productId: 'p1',
      qtyAdded: 10,
      cost: 20,
    })

    expect(productRepo.products.get('p1')!.cost).toBe(15)
  })

  it('uses the new cost outright when previous stock was zero', async () => {
    const productRepo = new FakeProductRepo()
    const restockRepo = new FakeRestockRepo()
    const alertRepo = new FakeAlertRepo()
    productRepo.products.set('p1', makeProduct({ qty: 0, cost: 99 }))

    await recordRestock(productRepo, restockRepo, alertRepo, 's1', {
      productId: 'p1',
      qtyAdded: 5,
      cost: 12,
    })

    expect(productRepo.products.get('p1')!.cost).toBe(12)
  })

  it('emits a restock alert when bringing an out-of-stock product back', async () => {
    const productRepo = new FakeProductRepo()
    const restockRepo = new FakeRestockRepo()
    const alertRepo = new FakeAlertRepo()
    productRepo.products.set('p1', makeProduct({ qty: 0 }))

    await recordRestock(productRepo, restockRepo, alertRepo, 's1', {
      productId: 'p1',
      qtyAdded: 10,
    })

    expect(alertRepo.created).toContainEqual({
      type: 'ai_insight',
      message: 'Bread restocked — 10 units added.',
    })
  })

  it('throws when product does not exist', async () => {
    const productRepo = new FakeProductRepo()
    const restockRepo = new FakeRestockRepo()
    const alertRepo = new FakeAlertRepo()

    await expect(
      recordRestock(productRepo, restockRepo, alertRepo, 's1', {
        productId: 'missing',
        qtyAdded: 10,
      }),
    ).rejects.toThrow('Product not found')
  })
})
