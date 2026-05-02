import { describe, expect, it } from 'vitest'
import { completeStocktake } from './completeStocktake'
import { Product, NewProduct } from '@/domain/entities/product'
import { Stocktake, NewStocktake, StocktakeLine } from '@/domain/entities/stocktake'
import { IProductRepository } from '@/domain/repositories/IProductRepository'
import { IStocktakeRepository } from '@/domain/repositories/IStocktakeRepository'

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

class FakeStocktakeRepo implements IStocktakeRepository {
  saved: Stocktake[] = []
  async create(storeId: string, performedBy: string | null, data: NewStocktake): Promise<Stocktake> {
    const lines: StocktakeLine[] = data.lines.map((l, i) => ({
      id: `l${i}`,
      productId: l.productId,
      productName: null,
      systemQty: l.systemQty,
      countedQty: l.countedQty,
      variance: l.countedQty - l.systemQty,
      costPerUnit: l.costPerUnit,
    }))
    const s: Stocktake = {
      id: `s-${this.saved.length + 1}`,
      storeId,
      performedBy,
      performedAt: new Date().toISOString(),
      notes: data.notes ?? null,
      createdAt: new Date().toISOString(),
      lines,
    }
    this.saved.push(s)
    return s
  }
  async findRecent(): Promise<Stocktake[]> { return [...this.saved] }
}

function makeProduct(id: string, qty: number, cost = 10): Product {
  return {
    id, storeId: 's1', name: `Product ${id}`,
    price: 20, cost, qty, reorderPoint: 5,
    sku: null, photoUrl: null, expiryDate: null, vatInclusive: true, isAirtime: false, isBundle: false, isWeighable: false, unitLabel: 'each',
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  }
}

describe('completeStocktake', () => {
  it('persists a stocktake with one line per counted product', async () => {
    const productRepo = new FakeProductRepo()
    const stocktakeRepo = new FakeStocktakeRepo()
    productRepo.products.set('p1', makeProduct('p1', 10))
    productRepo.products.set('p2', makeProduct('p2', 20))

    const result = await completeStocktake(productRepo, stocktakeRepo, 's1', 'user1', {
      counts: { p1: 8, p2: 22 },
    })

    expect(stocktakeRepo.saved).toHaveLength(1)
    expect(result.lines).toHaveLength(2)
  })

  it('computes variance as counted - system per line', async () => {
    const productRepo = new FakeProductRepo()
    const stocktakeRepo = new FakeStocktakeRepo()
    productRepo.products.set('p1', makeProduct('p1', 10))
    productRepo.products.set('p2', makeProduct('p2', 20))

    const result = await completeStocktake(productRepo, stocktakeRepo, 's1', 'u1', {
      counts: { p1: 7, p2: 25 },
    })

    const byProduct = new Map(result.lines.map((l) => [l.productId, l]))
    expect(byProduct.get('p1')?.variance).toBe(-3)
    expect(byProduct.get('p2')?.variance).toBe(5)
  })

  it('captures cost-per-unit at the time of count', async () => {
    const productRepo = new FakeProductRepo()
    const stocktakeRepo = new FakeStocktakeRepo()
    productRepo.products.set('p1', makeProduct('p1', 10, 12.5))

    const result = await completeStocktake(productRepo, stocktakeRepo, 's1', null, {
      counts: { p1: 8 },
    })

    expect(result.lines[0].costPerUnit).toBe(12.5)
  })

  it('adjusts product qty to match counted qty (delta = variance)', async () => {
    const productRepo = new FakeProductRepo()
    const stocktakeRepo = new FakeStocktakeRepo()
    productRepo.products.set('p1', makeProduct('p1', 10))
    productRepo.products.set('p2', makeProduct('p2', 20))

    await completeStocktake(productRepo, stocktakeRepo, 's1', null, {
      counts: { p1: 7, p2: 25 },
    })

    expect(productRepo.products.get('p1')!.qty).toBe(7)
    expect(productRepo.products.get('p2')!.qty).toBe(25)
  })

  it('skips qty adjustment when variance is zero', async () => {
    const productRepo = new FakeProductRepo()
    const stocktakeRepo = new FakeStocktakeRepo()
    productRepo.products.set('p1', makeProduct('p1', 10))
    let updateCalls = 0
    const original = productRepo.updateQty.bind(productRepo)
    productRepo.updateQty = async (sid, pid, d) => { updateCalls++; return original(sid, pid, d) }

    await completeStocktake(productRepo, stocktakeRepo, 's1', null, {
      counts: { p1: 10 },
    })

    expect(updateCalls).toBe(0)
    expect(productRepo.products.get('p1')!.qty).toBe(10)
  })

  it('throws when counts is empty', async () => {
    const productRepo = new FakeProductRepo()
    const stocktakeRepo = new FakeStocktakeRepo()
    await expect(
      completeStocktake(productRepo, stocktakeRepo, 's1', null, { counts: {} }),
    ).rejects.toThrow(/at least one/)
  })

  it('throws when a counted product is not in the store', async () => {
    const productRepo = new FakeProductRepo()
    const stocktakeRepo = new FakeStocktakeRepo()
    await expect(
      completeStocktake(productRepo, stocktakeRepo, 's1', null, { counts: { ghost: 5 } }),
    ).rejects.toThrow(/not found/)
  })

  it('throws on negative or non-integer counted qty', async () => {
    const productRepo = new FakeProductRepo()
    const stocktakeRepo = new FakeStocktakeRepo()
    productRepo.products.set('p1', makeProduct('p1', 10))

    await expect(
      completeStocktake(productRepo, stocktakeRepo, 's1', null, { counts: { p1: -1 } }),
    ).rejects.toThrow(/non-negative/)
    await expect(
      completeStocktake(productRepo, stocktakeRepo, 's1', null, { counts: { p1: 2.5 } }),
    ).rejects.toThrow(/non-negative integer/)
  })
})
