export type Plan = 'free' | 'pro' | 'business' | 'enterprise'
export type StoreCategory = 'spaza' | 'general_dealer' | 'food_stall' | 'other'
export type TaxpayerType = 'sole_prop' | 'sbc' | 'turnover_tax' | 'company'

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
  /** SARS classification — drives the provisional-tax estimate. Defaults to
   *  sole_prop (personal income tax on net profit), which fits the SMME core. */
  taxpayerType: TaxpayerType
  /** Onboarding answer "do you have employees?". Stored per-store (not per-user)
   *  so a multi-store owner can have payroll on one shop but not another.
   *  Drives Manage-tile visibility for /payroll; OR'd against actual employee
   *  count so adding the first Employee row also surfaces the tile. */
  hasEmployees: boolean
  /** Information-density preference. When true, the dashboard's Manage tile
   *  grid collapses the "Books" section (accounting / reports / payroll /
   *  procurement) behind a disclosure, leaving only the "Daily" tools
   *  visible. Default true biases toward simplicity for the spaza audience;
   *  SMME owners flip it off from Settings to see everything by default. */
  simpleView: boolean
  /** When set and in the future, the store has elevated (Pro) access
   *  regardless of `plan`. Used for two windows:
   *    - existing accounts at paywall rollout (90 days)
   *    - new accounts at first-store creation (14-day Pro trial)
   *  Resolved into an "effective plan" via lib/effective-plan.ts. */
  grandfatheredUntil: string | null
  /** Billing state machine (see lib/subscription.ts). Orthogonal to plan
   *  and grandfather — drives `plan` through its lifecycle via webhook. */
  subscriptionStatus: SubscriptionStatus
  subscriptionActiveUntil: string | null
  subscriptionProvider: string | null
  subscriptionProviderRef: string | null
  subscriptionLastChargeAt: string | null
  subscriptionRetryCount: number
  createdAt: string
  updatedAt: string
}

export type SubscriptionStatus =
  | 'none'        // never subscribed
  | 'trialing'    // in trial / grandfather (orthogonal to billing)
  | 'active'      // paid, current
  | 'past_due'    // charge failed, retrying
  | 'cancelled'   // user cancelled, still has access until subscriptionActiveUntil
  | 'expired'     // lapsed
