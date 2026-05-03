export type Plan = 'free' | 'starter' | 'growth'
export type StoreCategory = 'spaza' | 'general_dealer' | 'food_stall' | 'other'

export interface Store {
  id: string
  ownerId: string
  name: string
  phone: string | null
  plan: Plan
  timezone: string
  category: StoreCategory | null
  location: string | null
  whatsappNumber: string | null
  onboardingCompleted: boolean
  vatRegistered: boolean
  vatNumber: string | null
  vatRate: number
  businessAddress: string | null
  /** True for the auto-seeded showcase store every account gets at signup.
   *  Lets the UI label the store and avoid mixing demo data with real flows. */
  isDemo: boolean
  createdAt: string
  updatedAt: string
}
