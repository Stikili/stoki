export type StoreRole = 'owner' | 'manager' | 'cashier'

export const STORE_ROLES: { value: StoreRole; label: string; description: string }[] = [
  { value: 'owner',   label: 'Owner',   description: 'Full access including team and store deletion' },
  { value: 'manager', label: 'Manager', description: 'Manage stock, sales, expenses, suppliers and view reports' },
  { value: 'cashier', label: 'Cashier', description: 'Record sales and view today’s totals only' },
]

export interface StoreUser {
  id: string
  storeId: string
  userId: string
  role: StoreRole
  email: string | null
  invitedBy: string | null
  joinedAt: string
  createdAt: string
}

export interface NewStoreUser {
  userId: string
  role: StoreRole
}
