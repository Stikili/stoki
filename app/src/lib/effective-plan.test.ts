import { describe, expect, it } from 'vitest'
import {
  effectivePlan,
  isTrialActive,
  trialDaysRemaining,
  planAtLeast,
  planRank,
  TRIAL_DAYS,
} from './effective-plan'
import type { Plan } from '@/domain/entities/store'

const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()
const past   = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()

describe('effectivePlan', () => {
  it('returns the stored plan when no trial is set', () => {
    expect(effectivePlan({ plan: 'free',     grandfatheredUntil: null })).toBe('free')
    expect(effectivePlan({ plan: 'pro',      grandfatheredUntil: null })).toBe('pro')
    expect(effectivePlan({ plan: 'business', grandfatheredUntil: null })).toBe('business')
  })

  it('elevates a free plan to business while trial is active', () => {
    // New pricing model: trial grants Business-tier access so users get
    // to try payroll / broadcasts / multi-store before deciding.
    expect(effectivePlan({ plan: 'free', grandfatheredUntil: future(7) })).toBe('business')
  })

  it('elevates a paid Pro plan to business while trial is active', () => {
    // Pro user in trial should also see Business features — trial covers
    // both paid tiers.
    expect(effectivePlan({ plan: 'pro', grandfatheredUntil: future(7) })).toBe('business')
  })

  it('returns stored plan after trial has expired', () => {
    expect(effectivePlan({ plan: 'free', grandfatheredUntil: past(1) })).toBe('free')
  })

  it('never downgrades an already-Business plan during trial', () => {
    expect(effectivePlan({ plan: 'business', grandfatheredUntil: future(30) })).toBe('business')
  })

  it('never downgrades an Enterprise plan during trial', () => {
    expect(effectivePlan({ plan: 'enterprise', grandfatheredUntil: future(30) })).toBe('enterprise')
  })
})

describe('isTrialActive', () => {
  it('true when trial expiry is in the future', () => {
    expect(isTrialActive({ grandfatheredUntil: future(1) })).toBe(true)
  })
  it('false when trial expiry is null', () => {
    expect(isTrialActive({ grandfatheredUntil: null })).toBe(false)
  })
  it('false when trial expiry is in the past', () => {
    expect(isTrialActive({ grandfatheredUntil: past(1) })).toBe(false)
  })
})

describe('trialDaysRemaining', () => {
  it('rounds down to whole days', () => {
    const days = trialDaysRemaining({ grandfatheredUntil: future(3.4) })
    expect(days).toBe(3)
  })
  it('zero when inactive', () => {
    expect(trialDaysRemaining({ grandfatheredUntil: null })).toBe(0)
    expect(trialDaysRemaining({ grandfatheredUntil: past(1) })).toBe(0)
  })
})

describe('TRIAL_DAYS', () => {
  it('is 90 days per the SVP-Product decision on 2026-07-05', () => {
    expect(TRIAL_DAYS).toBe(90)
  })
})

describe('planAtLeast', () => {
  it('orders free < pro < business < enterprise', () => {
    const order: Plan[] = ['free', 'pro', 'business', 'enterprise']
    for (let i = 0; i < order.length; i++) {
      for (let j = 0; j < order.length; j++) {
        expect(planAtLeast(order[i], order[j])).toBe(i >= j)
      }
    }
  })
})

describe('planRank', () => {
  it('returns distinct values per plan', () => {
    const ranks = (['free', 'pro', 'business', 'enterprise'] as Plan[]).map(planRank)
    expect(new Set(ranks).size).toBe(4)
  })
})
