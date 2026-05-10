import type { Plan, Store } from '@/domain/entities/store'
import { effectivePlan, planAtLeast } from './effective-plan'

/**
 * Central registry of feature gates.
 *
 * One source of truth — used by:
 *   - server actions to enforce gates ("don't create the invoice")
 *   - the UpgradePrompt UI to know what to advertise
 *   - the AI advisor to silently drop locked feature blocks
 *
 * Adding a new gate is one edit here. Keep entries sorted by gate id.
 */

export type GateId =
  // Trader / invoicing
  | 'invoice.create'
  | 'invoice.payments'
  // Team
  | 'team.invite.beyond_owner'
  | 'team.invite.beyond_2'
  // Multi-store
  | 'store.create.beyond_1'
  | 'store.create.beyond_3'
  // Reports
  | 'reports.bank_reconcile'
  | 'reports.cross_store'
  | 'reports.accounting_export'
  // WhatsApp broadcasts
  | 'broadcast.send'
  // AI advisor — locked feature blocks per the spec
  | 'advisor.local_price'         // F-A-01
  | 'advisor.basket_analysis'     // F-A-03
  | 'advisor.supplier_scorecard'  // F-A-04
  | 'advisor.peer_benchmarking'   // F-A-09
  | 'advisor.group_buying'        // F-A-11
  | 'advisor.business_valuation'  // F-A-12
  | 'advisor.funding_navigator'   // F-A-13

interface Gate {
  /** Minimum plan that has this feature. */
  minPlan: Plan
  /** Short label used by the upgrade prompt. */
  label: string
  /** One-line description shown in the upgrade prompt. */
  description: string
}

export const GATES: Record<GateId, Gate> = {
  'invoice.create':            { minPlan: 'pro',      label: 'B2B invoicing',              description: 'Issue numbered SARS-compliant tax invoices to customers.' },
  'invoice.payments':          { minPlan: 'pro',      label: 'Invoice payment recording',  description: 'Record EFT / card / cash payments against open invoices.' },

  'team.invite.beyond_owner':  { minPlan: 'pro',      label: 'Add a teammate',             description: 'Bring on a cashier or manager so you don\'t run the till alone.' },
  'team.invite.beyond_2':      { minPlan: 'business', label: 'Larger team (up to 10)',     description: 'Add managers and cashiers across multiple shifts.' },

  'store.create.beyond_1':     { minPlan: 'business', label: 'Multiple stores',            description: 'Run more than one shop with aggregated reporting.' },
  'store.create.beyond_3':     { minPlan: 'enterprise', label: 'Unlimited stores',          description: 'Chain / franchise rollouts. Talk to us.' },

  'reports.bank_reconcile':    { minPlan: 'pro',      label: 'Bank reconciliation',        description: 'Match FNB / Nedbank / ABSA / Capitec / Standard CSVs to your invoices and expenses.' },
  'reports.cross_store':       { minPlan: 'business', label: 'Cross-store reports',        description: 'Roll up sales, stock, and P&L across every shop you own.' },
  'reports.accounting_export': { minPlan: 'pro',      label: 'Accounting exports',         description: 'Send to Xero / Sage / your accountant in one click.' },

  'broadcast.send':            { minPlan: 'pro',      label: 'WhatsApp broadcasts',        description: 'Send Meta-templated marketing messages to opted-in customers.' },

  'advisor.local_price':       { minPlan: 'pro',      label: 'Local price benchmarking',   description: 'See how your prices compare to nearby shops.' },
  'advisor.basket_analysis':   { minPlan: 'pro',      label: 'Basket analysis',            description: 'Which products customers buy together — for shelf layout and bundles.' },
  'advisor.supplier_scorecard':{ minPlan: 'pro',      label: 'Supplier scorecard',         description: 'Rank suppliers on price consistency, delivery, and trend.' },
  'advisor.peer_benchmarking': { minPlan: 'pro',      label: 'Peer benchmarking',          description: 'Anonymously compare your performance to similar shops.' },
  'advisor.group_buying':      { minPlan: 'pro',      label: 'Group buying coordinator',   description: 'Pool restock orders with nearby shops to hit wholesale tiers.' },
  'advisor.business_valuation':{ minPlan: 'pro',      label: 'Business valuation guide',   description: 'Know what your shop is worth if you ever want to sell.' },
  'advisor.funding_navigator': { minPlan: 'pro',      label: 'Funding navigator',          description: 'SEFA / NYDA / NEF / commercial — what fits you, with application links.' },
}

/** True when the store's effective plan satisfies the gate. */
export function hasFeature(
  store: Pick<Store, 'plan' | 'grandfatheredUntil'>,
  gate: GateId,
): boolean {
  const required = GATES[gate].minPlan
  return planAtLeast(effectivePlan(store), required)
}

/**
 * Throwable variant for use in server actions.
 *
 *   const { store } = await getServerData()
 *   requireFeature(store, 'invoice.create')
 *   // ... go ahead
 */
export class FeatureLockedError extends Error {
  constructor(public gate: GateId, public minPlan: Plan) {
    super(`Feature "${gate}" requires plan "${minPlan}"`)
    this.name = 'FeatureLockedError'
  }
}

export function requireFeature(
  store: Pick<Store, 'plan' | 'grandfatheredUntil'>,
  gate: GateId,
): void {
  if (hasFeature(store, gate)) return
  throw new FeatureLockedError(gate, GATES[gate].minPlan)
}

/** Plan-aware advisor daily limit. Free is the cost-controlled tier; paid
 *  plans get a much higher ceiling that's effectively unlimited for normal
 *  use. Override via env in production. */
export function advisorDailyLimit(plan: Plan): number {
  switch (plan) {
    case 'free':       return Number(process.env.ADVISOR_DAILY_LIMIT ?? 10)
    case 'pro':        return Number(process.env.ADVISOR_DAILY_LIMIT_PRO ?? 500)
    case 'business':
    case 'enterprise': return Number(process.env.ADVISOR_DAILY_LIMIT_BUSINESS ?? 5_000)
  }
}
