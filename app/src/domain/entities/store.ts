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
  /** Optional GPS — used by F-P-06 (weather) + F-P-08 (competitor proximity).
   *  Captured from the browser geolocation API in /settings/store. */
  lat: number | null
  lng: number | null
  /** Owner-logged cash float — feeds F-P-07 (working-capital-gap). Updated
   *  manually; we don't link to a bank API. NULL means "not tracked yet"
   *  and the working-capital alert silently skips this store. */
  cashBalance: number | null
  cashBalanceUpdatedAt: string | null
  createdAt: string
  updatedAt: string
}
