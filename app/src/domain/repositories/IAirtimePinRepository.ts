import { AirtimePin, NewAirtimePin } from '../entities/airtime-pin'

export interface IAirtimePinRepository {
  /** Bulk insert. Returns the count of rows actually persisted. */
  bulkInsert(storeId: string, productId: string, pins: NewAirtimePin[]): Promise<number>

  /** Total available (unsold + not-yet-expired) PINs for a product. */
  countAvailable(storeId: string, productId: string, now?: Date): Promise<number>

  /**
   * Atomically pop the oldest unsold PIN for the product, mark it sold, and
   * link it to the sale that consumed it. Returns null if none available.
   * Implementation must avoid double-dispensing under concurrent calls.
   */
  dispense(storeId: string, productId: string, saleId: string, now?: Date): Promise<AirtimePin | null>

  /** Recent dispensed PINs for an audit trail (last N). */
  findSold(storeId: string, productId: string, limit?: number): Promise<AirtimePin[]>
}
