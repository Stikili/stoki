export type StockStatus = 'ok' | 'low' | 'out'

export type ProductUnit = 'each' | 'kg' | 'g' | 'l' | 'ml'

export type VatCode = 'standard' | 'zero' | 'exempt'

export const VAT_CODES: { value: VatCode; label: string; description: string }[] = [
  { value: 'standard', label: 'Standard 15%', description: 'Most retail goods — sweets, drinks, cigarettes, snacks.' },
  { value: 'zero',     label: 'Zero-rated 0%', description: 'Brown bread, maize meal, milk, eggs, samp, beans, rice (and other SARS-listed basics).' },
  { value: 'exempt',   label: 'Exempt',        description: 'Out of VAT scope — rare for retail.' },
]

export const PRODUCT_UNITS: { value: ProductUnit; label: string }[] = [
  { value: 'each', label: 'Each' },
  { value: 'kg',   label: 'Kilograms' },
  { value: 'g',    label: 'Grams' },
  { value: 'l',    label: 'Litres' },
  { value: 'ml',   label: 'Millilitres' },
]

export interface Product {
  id: string
  storeId: string
  name: string
  price: number
  cost: number
  qty: number
  reorderPoint: number
  sku: string | null
  photoUrl: string | null
  expiryDate: string | null
  vatInclusive: boolean
  isAirtime: boolean
  isBundle: boolean
  /** When true, qty is treated as a decimal weight/volume in `unitLabel`. */
  isWeighable: boolean
  unitLabel: ProductUnit
  /** SARS VAT classification — drives VAT201 output-VAT split. Default 'standard'. */
  vatCode: VatCode
  createdAt: string
  updatedAt: string
}

export interface ProductWithStatus extends Product {
  status: StockStatus
  margin: number
  marginPct: number
}

export interface NewProduct {
  name: string
  price: number
  cost: number
  qty: number
  reorderPoint: number
  sku?: string
  expiryDate?: string
  vatInclusive?: boolean
  isAirtime?: boolean
  isBundle?: boolean
  isWeighable?: boolean
  unitLabel?: ProductUnit
  vatCode?: VatCode
}

export function getStockStatus(qty: number, reorderPoint: number): StockStatus {
  if (qty <= 0) return 'out'
  if (qty <= reorderPoint) return 'low'
  return 'ok'
}

export function withStatus(product: Product): ProductWithStatus {
  const margin = product.price - product.cost
  const marginPct = product.price > 0 ? (margin / product.price) * 100 : 0
  return {
    ...product,
    status: getStockStatus(product.qty, product.reorderPoint),
    margin,
    marginPct,
  }
}

/**
 * Whole days from `now` until expiry. Negative once expired.
 * Returns `null` when the product has no expiry date set.
 */
export function daysUntilExpiry(product: Pick<Product, 'expiryDate'>, now: Date = new Date()): number | null {
  if (!product.expiryDate) return null
  const expiry = new Date(product.expiryDate)
  const ms = expiry.getTime() - now.getTime()
  return Math.ceil(ms / 86_400_000)
}

/**
 * "Expiring soon" = within `withinDays` days, or already expired.
 * Returns false when the product has no expiry date.
 */
export function isExpiringSoon(product: Pick<Product, 'expiryDate'>, withinDays = 7, now: Date = new Date()): boolean {
  const days = daysUntilExpiry(product, now)
  if (days === null) return false
  return days <= withinDays
}

/**
 * Render qty for display. Piece goods → bare integer ("12"). Weighables →
 * decimal qty with unit ("1.250 kg") or auto-converted to a smaller unit
 * ("250 g" instead of "0.250 kg") to keep the number readable.
 */
export function formatQty(
  qty: number,
  product: Pick<Product, 'isWeighable' | 'unitLabel'>,
): string {
  if (!product.isWeighable || product.unitLabel === 'each') {
    // Drop trailing decimals for whole numbers, otherwise show up to 3.
    return Number.isInteger(qty) ? String(qty) : qty.toFixed(3)
  }
  if (product.unitLabel === 'kg' && qty > 0 && qty < 1) return `${Math.round(qty * 1000)}g`
  if (product.unitLabel === 'l' && qty > 0 && qty < 1)  return `${Math.round(qty * 1000)}ml`
  return `${qty.toFixed(3)} ${product.unitLabel}`
}

/** Step value for HTML number inputs — piece goods step by 1, weighables by 0.001. */
export function qtyStep(product: Pick<Product, 'isWeighable' | 'unitLabel'>): string {
  if (!product.isWeighable || product.unitLabel === 'each') return '1'
  return '0.001'
}
