import { describe, expect, it } from 'vitest'
import { recordBundleSale } from './recordBundleSale'
import { Product, NewProduct } from '@/domain/entities/product'
import { Sale, NewSale } from '@/domain/entities/sale'
import { Store } from '@/domain/entities/store'
import { Alert, AlertType } from '@/domain/entities/alert'
import { BundleComponent, NewBundleComponent } from '@/domain/entities/bundle'
import { ISaleRepository } from '@/domain/repositories/ISaleRepository'
import { IProductRepository } from '@/domain/repositories/IProductRepository'
import { IAlertRepository } from '@/domain/repositories/IAlertRepository'
import { IBundleComponentRepository } from '@/domain/repositories/IBundleComponentRepository'

class FakeProductRepo implements IProductRepository {
  products = new Map<string, Product>()
  async findAll(): Promise<Product[]> { return [...this.products.values()] }
  async findById(_s: string, id: string): Promise<Product | null> {
    return this.products.get(id) ?? null
  }
  async create(): Promise<Product> { throw new Error('not used') }
  async update(_s: string, id: string, data: Partial<NewProduct>): Promise<Product> {
    const p = this.products.get(id)!
    const updated: Product = {
      ...p, ...data,
      vatInclusive: data.vatInclusive ?? p.vatInclusive,
      isAirtime: data.isAirtime ?? p.isAirtime,
      isBundle: data.isBundle ?? p.isBundle,
    }
    this.products.set(id, updated)
    return updated
  }
  async updateQty(_s: string, id: string, delta: number): Promise<void> {
    const p = this.products.get(id)!
    this.products.set(id, { ...p, qty: p.qty + delta })
  }
  async archive(): Promise<void> {}
  async setVatInclusiveAll(): Promise<number> { return 0 }
}

class FakeSaleRepo implements ISaleRepository {
  saved: Sale[] = []
  invoiceCounter = 1000
  async record(storeId: string, data: NewSale & { costAtSale: number; vatAmount: number; invoiceNumber: number | null }): Promise<Sale> {
    const sale: Sale = {
      id: `sale-${this.saved.length + 1}`,
      storeId,
      productId: data.productId,
      productName: null,
      qty: data.qty,
      priceAtSale: data.priceAtSale,
      costAtSale: data.costAtSale,
      vatAmount: data.vatAmount,
      invoiceNumber: data.invoiceNumber,
      type: data.type ?? 'sale',
      channel: data.channel ?? 'app',
      paymentMethod: data.paymentMethod ?? 'cash',
      recordedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }
    this.saved.push(sale)
    return sale
  }
  async findById(): Promise<Sale | null> { return null }
  async findByPeriod(): Promise<Sale[]> { return [] }
  async summarise() {
    return { totalRevenue: 0, totalCost: 0, totalMargin: 0, totalVat: 0, transactionCount: 0, itemsSold: 0 }
  }
  async claimInvoiceNumber(): Promise<number> {
    return ++this.invoiceCounter
  }
}

class FakeBundleRepo implements IBundleComponentRepository {
  byBundle = new Map<string, BundleComponent[]>()
  async findByBundle(_s: string, bundleId: string): Promise<BundleComponent[]> {
    return this.byBundle.get(bundleId) ?? []
  }
  async replaceAll(_s: string, bundleId: string, components: NewBundleComponent[]): Promise<void> {
    this.byBundle.set(bundleId, components.map((c, i) => ({
      id: `bc-${i}`,
      storeId: 's1',
      bundleId,
      componentId: c.componentId,
      componentName: null,
      componentCost: null,
      componentQty: null,
      qty: c.qty,
      createdAt: new Date().toISOString(),
    })))
  }
}

class FakeAlertRepo implements IAlertRepository {
  created: { type: AlertType; message: string }[] = []
  async findAll(): Promise<Alert[]> { return [] }
  async findUnread(): Promise<Alert[]> { return [] }
  async create(_s: string, type: AlertType, message: string): Promise<Alert> {
    this.created.push({ type, message })
    return { id: 'a', storeId: 's1', type, message, readAt: null, actionTakenAt: null, createdAt: '' }
  }
  async markRead(): Promise<void> {}
  async markAllRead(): Promise<void> {}
  async markActionTaken(): Promise<void> {}
}

function makeProduct(id: string, overrides: Partial<Product> = {}): Product {
  return {
    id, storeId: 's1', name: id, price: 50, cost: 30, qty: 10, reorderPoint: 5,
    sku: null, photoUrl: null, expiryDate: null, vatInclusive: true,
    isAirtime: false, isBundle: false, isWeighable: false, unitLabel: 'each',
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeStore(): Store {
  return {
    id: 's1', ownerId: 'u1', name: 'Test', phone: null, plan: 'free', timezone: 'Africa/Johannesburg',
    category: null, location: null, whatsappNumber: null,
    onboardingCompleted: true, vatRegistered: false, vatNumber: null, vatRate: 15,
    businessAddress: null,
    isDemo: false,
    lat: null, lng: null, cashBalance: null, cashBalanceUpdatedAt: null,
    grandfatheredUntil: null,
    subscriptionStatus: 'none',
    subscriptionActiveUntil: null, subscriptionProvider: null, subscriptionProviderRef: null,
    subscriptionLastChargeAt: null, subscriptionRetryCount: 0,
    createdAt: '', updatedAt: '',
  }
}

function makeBundleComponents(repo: FakeBundleRepo, bundleId: string, components: { id: string; qty: number; cost: number; stock: number; name: string }[]) {
  repo.byBundle.set(bundleId, components.map((c, i) => ({
    id: `bc-${i}`,
    storeId: 's1',
    bundleId,
    componentId: c.id,
    componentName: c.name,
    componentCost: c.cost,
    componentQty: c.stock,
    qty: c.qty,
    createdAt: new Date().toISOString(),
  })))
}

describe('recordBundleSale — bundle path', () => {
  it('decrements each component, not the bundle itself', async () => {
    const productRepo = new FakeProductRepo()
    const saleRepo = new FakeSaleRepo()
    const bundleRepo = new FakeBundleRepo()
    const alertRepo = new FakeAlertRepo()

    productRepo.products.set('combo', makeProduct('combo', { isBundle: true, qty: 0, name: 'Combo' }))
    productRepo.products.set('sandwich', makeProduct('sandwich', { qty: 10, cost: 5, name: 'Sandwich' }))
    productRepo.products.set('juice', makeProduct('juice', { qty: 8, cost: 3, name: 'Juice' }))

    makeBundleComponents(bundleRepo, 'combo', [
      { id: 'sandwich', qty: 1, cost: 5, stock: 10, name: 'Sandwich' },
      { id: 'juice', qty: 1, cost: 3, stock: 8, name: 'Juice' },
    ])

    await recordBundleSale(saleRepo, productRepo, bundleRepo, alertRepo, makeStore(), {
      productId: 'combo',
      qty: 2,
      priceAtSale: 25,
      channel: 'app',
    })

    expect(productRepo.products.get('combo')!.qty).toBe(0) // unchanged
    expect(productRepo.products.get('sandwich')!.qty).toBe(8) // -2
    expect(productRepo.products.get('juice')!.qty).toBe(6)    // -2
  })

  it('records cost-at-sale as the sum of component costs', async () => {
    const productRepo = new FakeProductRepo()
    const saleRepo = new FakeSaleRepo()
    const bundleRepo = new FakeBundleRepo()
    const alertRepo = new FakeAlertRepo()

    productRepo.products.set('combo', makeProduct('combo', { isBundle: true }))
    productRepo.products.set('a', makeProduct('a'))
    productRepo.products.set('b', makeProduct('b'))
    makeBundleComponents(bundleRepo, 'combo', [
      { id: 'a', qty: 2, cost: 5, stock: 100, name: 'A' }, // 10
      { id: 'b', qty: 1, cost: 3, stock: 100, name: 'B' }, //  3
    ])

    await recordBundleSale(saleRepo, productRepo, bundleRepo, alertRepo, makeStore(), {
      productId: 'combo',
      qty: 1,
      priceAtSale: 25,
      channel: 'app',
    })

    expect(saleRepo.saved[0].costAtSale).toBe(13)
  })

  it('records the bundle as the sale productId (single receipt line)', async () => {
    const productRepo = new FakeProductRepo()
    const saleRepo = new FakeSaleRepo()
    const bundleRepo = new FakeBundleRepo()
    const alertRepo = new FakeAlertRepo()

    productRepo.products.set('combo', makeProduct('combo', { isBundle: true }))
    productRepo.products.set('a', makeProduct('a'))
    makeBundleComponents(bundleRepo, 'combo', [
      { id: 'a', qty: 1, cost: 5, stock: 10, name: 'A' },
    ])

    await recordBundleSale(saleRepo, productRepo, bundleRepo, alertRepo, makeStore(), {
      productId: 'combo',
      qty: 1,
      priceAtSale: 25,
      channel: 'app',
    })

    expect(saleRepo.saved[0].productId).toBe('combo')
  })

  it('refuses the sale when any component is short', async () => {
    const productRepo = new FakeProductRepo()
    const saleRepo = new FakeSaleRepo()
    const bundleRepo = new FakeBundleRepo()
    const alertRepo = new FakeAlertRepo()

    productRepo.products.set('combo', makeProduct('combo', { isBundle: true }))
    productRepo.products.set('rare', makeProduct('rare'))
    makeBundleComponents(bundleRepo, 'combo', [
      { id: 'rare', qty: 5, cost: 10, stock: 3, name: 'Rare' }, // need 5, have 3
    ])

    await expect(recordBundleSale(saleRepo, productRepo, bundleRepo, alertRepo, makeStore(), {
      productId: 'combo',
      qty: 1,
      priceAtSale: 25,
      channel: 'app',
    })).rejects.toThrow(/short 2/i)
    expect(saleRepo.saved).toEqual([]) // didn't write
  })

  it('refuses bundles with no components configured yet', async () => {
    const productRepo = new FakeProductRepo()
    const saleRepo = new FakeSaleRepo()
    const bundleRepo = new FakeBundleRepo()
    const alertRepo = new FakeAlertRepo()

    productRepo.products.set('empty', makeProduct('empty', { isBundle: true, name: 'Empty' }))

    await expect(recordBundleSale(saleRepo, productRepo, bundleRepo, alertRepo, makeStore(), {
      productId: 'empty',
      qty: 1,
      priceAtSale: 20,
      channel: 'app',
    })).rejects.toThrow(/no components/i)
  })

  it('emits low-stock alert on component when stock drops to/below reorder point', async () => {
    const productRepo = new FakeProductRepo()
    const saleRepo = new FakeSaleRepo()
    const bundleRepo = new FakeBundleRepo()
    const alertRepo = new FakeAlertRepo()

    productRepo.products.set('combo', makeProduct('combo', { isBundle: true }))
    productRepo.products.set('a', makeProduct('a', { qty: 6, reorderPoint: 5 }))
    makeBundleComponents(bundleRepo, 'combo', [
      { id: 'a', qty: 1, cost: 5, stock: 6, name: 'A' },
    ])

    await recordBundleSale(saleRepo, productRepo, bundleRepo, alertRepo, makeStore(), {
      productId: 'combo',
      qty: 2, // drops a from 6 to 4
      priceAtSale: 25,
      channel: 'app',
    })

    expect(alertRepo.created.some((a) => a.type === 'low_stock')).toBe(true)
  })

  it('reverses (increments) component stock on a return', async () => {
    const productRepo = new FakeProductRepo()
    const saleRepo = new FakeSaleRepo()
    const bundleRepo = new FakeBundleRepo()
    const alertRepo = new FakeAlertRepo()

    productRepo.products.set('combo', makeProduct('combo', { isBundle: true }))
    productRepo.products.set('a', makeProduct('a', { qty: 5 }))
    makeBundleComponents(bundleRepo, 'combo', [
      { id: 'a', qty: 1, cost: 5, stock: 5, name: 'A' },
    ])

    await recordBundleSale(saleRepo, productRepo, bundleRepo, alertRepo, makeStore(), {
      productId: 'combo',
      qty: 1,
      priceAtSale: 25,
      type: 'return',
      channel: 'app',
    })

    expect(productRepo.products.get('a')!.qty).toBe(6)
  })
})

describe('recordBundleSale — non-bundle delegation', () => {
  it('delegates piece goods to the standard recordSale path', async () => {
    const productRepo = new FakeProductRepo()
    const saleRepo = new FakeSaleRepo()
    const bundleRepo = new FakeBundleRepo()
    const alertRepo = new FakeAlertRepo()

    productRepo.products.set('p1', makeProduct('p1', { qty: 10 }))

    await recordBundleSale(saleRepo, productRepo, bundleRepo, alertRepo, makeStore(), {
      productId: 'p1',
      qty: 3,
      priceAtSale: 50,
      channel: 'app',
    })

    expect(saleRepo.saved).toHaveLength(1)
    expect(productRepo.products.get('p1')!.qty).toBe(7) // standard decrement
  })
})
