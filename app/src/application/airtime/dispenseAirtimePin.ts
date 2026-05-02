import { IAirtimePinRepository } from '@/domain/repositories/IAirtimePinRepository'
import { IProductRepository } from '@/domain/repositories/IProductRepository'
import { AirtimePin } from '@/domain/entities/airtime-pin'

/**
 * Dispense the next available PIN for an airtime sale. Idempotent in
 * the sense that it never re-dispenses an already-sold PIN.
 *
 * Returns null when the product isn't airtime (so callers can blindly
 * invoke this for every sale and let it no-op for piece goods). Throws
 * when an airtime product runs out of PINs — the sale should not have
 * been completed in that case; callers should pre-check stock and surface
 * a friendly error.
 */
export async function dispenseAirtimePin(
  productRepo: IProductRepository,
  pinRepo: IAirtimePinRepository,
  storeId: string,
  productId: string,
  saleId: string,
  now: Date = new Date(),
): Promise<AirtimePin | null> {
  const product = await productRepo.findById(storeId, productId)
  if (!product) throw new Error('Product not found')
  if (!product.isAirtime) return null

  const pin = await pinRepo.dispense(storeId, productId, saleId, now)
  if (!pin) {
    throw new Error(
      `Airtime sold out for "${product.name}". Upload more PINs before selling.`,
    )
  }
  return pin
}

/**
 * Pre-flight check the cashier UI runs before submitting an airtime cart.
 * Returns the list of products that don't have enough PINs to cover the
 * requested quantities. Empty list means the cart is safe to submit.
 */
export async function checkAirtimeAvailability(
  productRepo: IProductRepository,
  pinRepo: IAirtimePinRepository,
  storeId: string,
  items: { productId: string; qty: number }[],
  now: Date = new Date(),
): Promise<{ productId: string; productName: string; requested: number; available: number }[]> {
  const shortages: { productId: string; productName: string; requested: number; available: number }[] = []

  // Aggregate requested qty per airtime product (the same product may appear
  // on multiple cart lines — sum them so a 3+2 cart needs 5 PINs).
  const requested = new Map<string, number>()
  for (const item of items) {
    requested.set(item.productId, (requested.get(item.productId) ?? 0) + item.qty)
  }

  for (const [productId, qty] of requested) {
    const product = await productRepo.findById(storeId, productId)
    if (!product || !product.isAirtime) continue
    const available = await pinRepo.countAvailable(storeId, productId, now)
    if (available < qty) {
      shortages.push({ productId, productName: product.name, requested: qty, available })
    }
  }

  return shortages
}
