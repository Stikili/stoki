export type WastageReason = 'expired' | 'damaged' | 'theft' | 'other'

export const WASTAGE_REASONS: { value: WastageReason; label: string }[] = [
  { value: 'expired', label: 'Expired' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'theft',   label: 'Theft / shrinkage' },
  { value: 'other',   label: 'Other' },
]

export interface Wastage {
  id: string
  storeId: string
  productId: string | null
  productName: string | null
  qty: number
  costAtLoss: number
  reason: WastageReason
  notes: string | null
  recordedAt: string
  createdAt: string
}

export interface NewWastage {
  productId: string
  qty: number
  reason?: WastageReason
  notes?: string
  recordedAt?: string
}
