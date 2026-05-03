import { describe, expect, it } from 'vitest'
import { recordSale } from './recordSale'
import { Sale, NewSale, SalesSummary } from '@/domain/entities/sale'
import { Product, NewProduct } from '@/domain/entities/product'
import { Alert, AlertType } from '@/domain/entities/alert'
import { Store } from '@/domain/entities/store'
import { ISaleRepository } from '@/domain/repositories/ISaleRepository'
import { IProductRepository } from '@/domain/repositories/IProductRepository'
import { IAlertRepository } from '@/domain/repositories/IAlertRepository'

// In-memory fakes — the application layer's contract is the repository
// interfaces, so we test it against deterministic in-memory implementations.

class FakeSaleRepo implements ISaleRepository {
  sales: Sale[] = []
  invoiceCounter = 100
  async record(storeId: string, data: NewSale): Promise<Sale> {
    const sale: Sale = {
      id: `sale-${this.sales.length + 1}`,
      storeId,
      productId: data.productId,
      productName: null,
      qty: data.qty,
      priceAtSale: data.priceAtSale,
      costAtSale: data.costAtSale ?? 0,
      vatAmount: data.vatAmount ?? 0,
      invoiceNumber: data.invoiceNumber ?? null,
      type: data.type ?? 'sale',
      channel: data.channel ?? 'app',
      paymentMethod: data.paymentMethod ?? 'cash',
      recordedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }
    this.sales.push(sale)
    return sale
  }
  async findById(_storeId: string, saleId: string): Promise<Sale | null> {
    return this.sales.find(s => s.id === saleId) ?? null
  }
  async findByPeriod(): Promise<Sale[]> { return [] }
  async summarise(): Promise<SalesSummary> {
    return { totalRevenue: 0, totalCost: 0, totalMargin: 0, totalVat: 0, transactionCount: 0, itemsSold: 0 }
  }
  async claimInvoiceNumber(): Promise<number> {
    return ++this.invoiceCounter
  }
}

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

function makeStore(overrides: Partial<Store> = {}): Store {
  return {
    id: 's1',
    ownerId: 'u1',
    name: 'Test Store',
    phone: null,
    plan: 'free',
    timezone: 'Africa/Johannesburg',
    category: 'spaza',
    location: null,
    whatsappNumber: null,
    onboardingCompleted: true,
    vatRegistered: false,
    vatNumber: null,
    vatRate: 15,
    businessAddress: null,
    isDemo: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
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

describe('recordSale', () => {
  it('persists the sale, decrements stock, and uses cost from product when not provided', async () => {
    const saleRepo = new FakeSaleRepo()
    const productRepo = new FakeProductRepo()
    const alertRepo = new FakeAlertRepo()
    productRepo.products.set('p1', makeProduct())

    await recordSale(saleRepo, productRepo, alertRepo, makeStore(), {
      productId: 'p1',
      qty: 2,
      priceAtSale: 23,
    })

    expect(saleRepo.sales).toHaveLength(1)
    expect(saleRepo.sales[0].costAtSale).toBe(15)
    expect(productRepo.products.get('p1')!.qty).toBe(8)
  })

  it('captures VAT for VAT-registered store with inclusive product', async () => {
    const saleRepo = new FakeSaleRepo()
    const productRepo = new FakeProductRepo()
    const alertRepo = new FakeAlertRepo()
    productRepo.products.set('p1', makeProduct({ vatInclusive: true }))

    await recordSale(
      saleRepo, productRepo, alertRepo,
      makeStore({ vatRegistered: true, vatRate: 15 }),
      { productId: 'p1', qty: 1, priceAtSale: 23 },
    )

    // 23 incl @ 15% → R3 VAT
    expect(saleRepo.sales[0].vatAmount).toBe(3)
  })

  it('captures zero VAT for non-VAT-registered store', async () => {
    const saleRepo = new FakeSaleRepo()
    const productRepo = new FakeProductRepo()
    const alertRepo = new FakeAlertRepo()
    productRepo.products.set('p1', makeProduct())

    await recordSale(
      saleRepo, productRepo, alertRepo,
      makeStore({ vatRegistered: false }),
      { productId: 'p1', qty: 1, priceAtSale: 23 },
    )

    expect(saleRepo.sales[0].vatAmount).toBe(0)
  })

  it('claims an invoice number for VAT-registered stores', async () => {
    const saleRepo = new FakeSaleRepo()
    const productRepo = new FakeProductRepo()
    const alertRepo = new FakeAlertRepo()
    productRepo.products.set('p1', makeProduct())

    await recordSale(
      saleRepo, productRepo, alertRepo,
      makeStore({ vatRegistered: true }),
      { productId: 'p1', qty: 1, priceAtSale: 23 },
    )

    expect(saleRepo.sales[0].invoiceNumber).toBe(101)
  })

  it('does NOT claim an invoice number for non-VAT-registered stores', async () => {
    const saleRepo = new FakeSaleRepo()
    const productRepo = new FakeProductRepo()
    const alertRepo = new FakeAlertRepo()
    productRepo.products.set('p1', makeProduct())

    await recordSale(
      saleRepo, productRepo, alertRepo,
      makeStore({ vatRegistered: false }),
      { productId: 'p1', qty: 1, priceAtSale: 23 },
    )

    expect(saleRepo.sales[0].invoiceNumber).toBeNull()
  })

  it('honours a caller-provided invoice number (cart-shared numbering)', async () => {
    const saleRepo = new FakeSaleRepo()
    const productRepo = new FakeProductRepo()
    const alertRepo = new FakeAlertRepo()
    productRepo.products.set('p1', makeProduct())

    await recordSale(
      saleRepo, productRepo, alertRepo,
      makeStore({ vatRegistered: true }),
      { productId: 'p1', qty: 1, priceAtSale: 23, invoiceNumber: 42 },
    )

    expect(saleRepo.sales[0].invoiceNumber).toBe(42)
    // Counter not bumped — caller-provided number was honoured.
    expect(saleRepo.invoiceCounter).toBe(100)
  })

  it('reverses stock on a return', async () => {
    const saleRepo = new FakeSaleRepo()
    const productRepo = new FakeProductRepo()
    const alertRepo = new FakeAlertRepo()
    productRepo.products.set('p1', makeProduct({ qty: 8 }))

    await recordSale(saleRepo, productRepo, alertRepo, makeStore(), {
      productId: 'p1',
      qty: 2,
      priceAtSale: 23,
      type: 'return',
    })

    expect(productRepo.products.get('p1')!.qty).toBe(10)
  })

  it('emits an out-of-stock alert when the sale empties stock', async () => {
    const saleRepo = new FakeSaleRepo()
    const productRepo = new FakeProductRepo()
    const alertRepo = new FakeAlertRepo()
    productRepo.products.set('p1', makeProduct({ qty: 2, reorderPoint: 5 }))

    await recordSale(saleRepo, productRepo, alertRepo, makeStore(), {
      productId: 'p1',
      qty: 2,
      priceAtSale: 23,
    })

    expect(alertRepo.created).toContainEqual({ type: 'out_of_stock', message: 'Bread is now out of stock.' })
  })

  it('emits a low-stock alert when qty drops to/below reorder point', async () => {
    const saleRepo = new FakeSaleRepo()
    const productRepo = new FakeProductRepo()
    const alertRepo = new FakeAlertRepo()
    productRepo.products.set('p1', makeProduct({ qty: 6, reorderPoint: 5 }))

    await recordSale(saleRepo, productRepo, alertRepo, makeStore(), {
      productId: 'p1',
      qty: 1,
      priceAtSale: 23,
    })

    expect(alertRepo.created).toContainEqual({
      type: 'low_stock',
      message: 'Bread is running low — only 5 left.',
    })
  })
})
