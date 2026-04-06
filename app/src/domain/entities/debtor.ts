export interface Debtor {
  id: string
  storeId: string
  name: string
  phone: string | null
  totalOwed: number
  lastRemindedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface NewDebtor {
  name: string
  phone?: string
}

export function isOverdue(debtor: Debtor, thresholdDays = 14): boolean {
  if (debtor.totalOwed <= 0) return false
  const oldest = new Date(debtor.createdAt)
  const diffDays = (Date.now() - oldest.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays > thresholdDays
}
