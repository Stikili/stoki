export interface AirtimePin {
  id: string
  storeId: string
  productId: string
  pin: string
  serial: string | null
  expiresAt: string | null
  soldAt: string | null
  soldInSaleId: string | null
  createdAt: string
}

export interface NewAirtimePin {
  pin: string
  serial?: string | null
  expiresAt?: string | null
}

/** True when expires_at is in the past. Pins past expiry must not dispense. */
export function isExpired(pin: Pick<AirtimePin, 'expiresAt'>, now: Date = new Date()): boolean {
  if (!pin.expiresAt) return false
  return new Date(pin.expiresAt).getTime() < now.getTime()
}
