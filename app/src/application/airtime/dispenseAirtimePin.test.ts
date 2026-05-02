import { describe, expect, it } from 'vitest'
import { dispenseAirtimePin, checkAirtimeAvailability } from './dispenseAirtimePin'
import { Product, NewProduct } from '@/domain/entities/product'
import { AirtimePin, NewAirtimePin, isExpired } from '@/domain/entities/airtime-pin'
import { IProductRepository } from '@/domain/repositories/IProductRepository'
import { IAirtimePinRepository } from '@/domain/repositories/IAirtimePinRepository'

class FakeProductRepo implements IProductRepository {
  products = new Map<string, Product>()
  async findAll(): Promise<Product[]> { return [...this.products.values()] }
  async findById(_s: string, id: string): Promise<Product | null> {
    return this.products.get(id) ?? null
  }
  async create(): Promise<Product> { throw new Error('not used') }
  async update(_s: string, id: string, data: Partial<NewProduct>): Promise<Product> {
    const p = this.products.get(id)!
    const updated: Product = { ...p, ...data, vatInclusive: data.vatInclusive ?? p.vatInclusive, isAirtime: data.isAirtime ?? p.isAirtime }
    this.products.set(id, updated)
    return updated
  }
  async updateQty(): Promise<void> {}
  async archive(): Promise<void> {}
  async setVatInclusiveAll(): Promise<number> { return 0 }
}

class FakePinRepo implements IAirtimePinRepository {
  pins: AirtimePin[] = []
  async bulkInsert(storeId: string, productId: string, pins: NewAirtimePin[]): Promise<number> {
    for (const p of pins) {
      this.pins.push({
        id: `pin-${this.pins.length + 1}`,
        storeId, productId,
        pin: p.pin,
        serial: p.serial ?? null,
        expiresAt: p.expiresAt ?? null,
        soldAt: null, soldInSaleId: null,
        createdAt: new Date(2026, 0, 1 + this.pins.length).toISOString(),
      })
    }
    return pins.length
  }
  async countAvailable(_s: string, productId: string, now: Date = new Date()): Promise<number> {
    return this.pins.filter((p) => p.productId === productId && !p.soldAt && !isExpired(p, now)).length
  }
  async dispense(_s: string, productId: string, saleId: string, now: Date = new Date()): Promise<AirtimePin | null> {
    const next = this.pins
      .filter((p) => p.productId === productId && !p.soldAt && !isExpired(p, now))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]
    if (!next) return null
    next.soldAt = now.toISOString()
    next.soldInSaleId = saleId
    return next
  }
  async findSold(): Promise<AirtimePin[]> { return this.pins.filter((p) => p.soldAt) }
}

function makeProduct(id: string, isAirtime: boolean, name = 'Vodacom R10'): Product {
  return {
    id, storeId: 's1', name, price: 10, cost: 9.5, qty: 0, reorderPoint: 10,
    sku: null, photoUrl: null, expiryDate: null, vatInclusive: true, isAirtime, isBundle: false,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  }
}

describe('dispenseAirtimePin', () => {
  it('returns null for non-airtime products', async () => {
    const productRepo = new FakeProductRepo()
    const pinRepo = new FakePinRepo()
    productRepo.products.set('p1', makeProduct('p1', false))

    const pin = await dispenseAirtimePin(productRepo, pinRepo, 's1', 'p1', 'sale-1')
    expect(pin).toBeNull()
  })

  it('dispenses the oldest available PIN (FIFO)', async () => {
    const productRepo = new FakeProductRepo()
    const pinRepo = new FakePinRepo()
    productRepo.products.set('p1', makeProduct('p1', true))
    await pinRepo.bulkInsert('s1', 'p1', [
      { pin: 'AAA' },
      { pin: 'BBB' },
      { pin: 'CCC' },
    ])

    const first = await dispenseAirtimePin(productRepo, pinRepo, 's1', 'p1', 'sale-1')
    expect(first?.pin).toBe('AAA')

    const second = await dispenseAirtimePin(productRepo, pinRepo, 's1', 'p1', 'sale-2')
    expect(second?.pin).toBe('BBB')
  })

  it('marks the dispensed PIN sold and links to the consuming sale', async () => {
    const productRepo = new FakeProductRepo()
    const pinRepo = new FakePinRepo()
    productRepo.products.set('p1', makeProduct('p1', true))
    await pinRepo.bulkInsert('s1', 'p1', [{ pin: 'AAA' }])

    await dispenseAirtimePin(productRepo, pinRepo, 's1', 'p1', 'sale-42')
    expect(pinRepo.pins[0].soldAt).not.toBeNull()
    expect(pinRepo.pins[0].soldInSaleId).toBe('sale-42')
  })

  it('throws when the airtime product has no available PINs', async () => {
    const productRepo = new FakeProductRepo()
    const pinRepo = new FakePinRepo()
    productRepo.products.set('p1', makeProduct('p1', true))

    await expect(
      dispenseAirtimePin(productRepo, pinRepo, 's1', 'p1', 'sale-1'),
    ).rejects.toThrow(/sold out/i)
  })

  it('skips expired PINs and dispenses the next valid one', async () => {
    const productRepo = new FakeProductRepo()
    const pinRepo = new FakePinRepo()
    productRepo.products.set('p1', makeProduct('p1', true))
    await pinRepo.bulkInsert('s1', 'p1', [
      { pin: 'OLD', expiresAt: '2026-01-01' },
      { pin: 'GOOD', expiresAt: '2027-01-01' },
    ])

    const now = new Date('2026-06-01T00:00:00Z')
    const result = await dispenseAirtimePin(productRepo, pinRepo, 's1', 'p1', 'sale-1', now)
    expect(result?.pin).toBe('GOOD')
  })

  it('throws when the product does not exist', async () => {
    const productRepo = new FakeProductRepo()
    const pinRepo = new FakePinRepo()
    await expect(
      dispenseAirtimePin(productRepo, pinRepo, 's1', 'missing', 'sale-1'),
    ).rejects.toThrow(/not found/i)
  })
})

describe('checkAirtimeAvailability', () => {
  it('returns no shortages when stock covers all cart lines', async () => {
    const productRepo = new FakeProductRepo()
    const pinRepo = new FakePinRepo()
    productRepo.products.set('p1', makeProduct('p1', true))
    await pinRepo.bulkInsert('s1', 'p1', [{ pin: 'A' }, { pin: 'B' }, { pin: 'C' }])

    const shortages = await checkAirtimeAvailability(productRepo, pinRepo, 's1', [
      { productId: 'p1', qty: 2 },
    ])
    expect(shortages).toEqual([])
  })

  it('flags products short on PINs', async () => {
    const productRepo = new FakeProductRepo()
    const pinRepo = new FakePinRepo()
    productRepo.products.set('p1', makeProduct('p1', true, 'Vodacom R10'))
    await pinRepo.bulkInsert('s1', 'p1', [{ pin: 'A' }])

    const shortages = await checkAirtimeAvailability(productRepo, pinRepo, 's1', [
      { productId: 'p1', qty: 3 },
    ])
    expect(shortages).toEqual([
      { productId: 'p1', productName: 'Vodacom R10', requested: 3, available: 1 },
    ])
  })

  it('aggregates requested qty across cart lines for the same product', async () => {
    const productRepo = new FakeProductRepo()
    const pinRepo = new FakePinRepo()
    productRepo.products.set('p1', makeProduct('p1', true))
    await pinRepo.bulkInsert('s1', 'p1', [{ pin: 'A' }, { pin: 'B' }])

    const shortages = await checkAirtimeAvailability(productRepo, pinRepo, 's1', [
      { productId: 'p1', qty: 2 },
      { productId: 'p1', qty: 1 }, // total = 3, but only 2 PINs
    ])
    expect(shortages[0].requested).toBe(3)
    expect(shortages[0].available).toBe(2)
  })

  it('skips non-airtime products entirely', async () => {
    const productRepo = new FakeProductRepo()
    const pinRepo = new FakePinRepo()
    productRepo.products.set('p1', makeProduct('p1', false))

    const shortages = await checkAirtimeAvailability(productRepo, pinRepo, 's1', [
      { productId: 'p1', qty: 999 },
    ])
    expect(shortages).toEqual([])
  })
})
