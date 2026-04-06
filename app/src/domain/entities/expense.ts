export interface Expense {
  id: string
  storeId: string
  category: string
  description: string
  amount: number
  recordedAt: string
  createdAt: string
}

export interface NewExpense {
  category: string
  description: string
  amount: number
  recordedAt?: string
}

export const EXPENSE_CATEGORIES = [
  { key: 'rent', label: 'Rent' },
  { key: 'transport', label: 'Transport' },
  { key: 'airtime', label: 'Airtime / Data' },
  { key: 'stock', label: 'Stock Purchase' },
  { key: 'salary', label: 'Salary / Wages' },
  { key: 'utilities', label: 'Electricity / Water' },
  { key: 'other', label: 'Other' },
] as const
