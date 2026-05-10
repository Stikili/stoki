import { describe, expect, it } from 'vitest'
import {
  effectivePlan,
  isGrandfatherActive,
  grandfatherDaysRemaining,
  planAtLeast,
  planRank,
} from './effective-plan'
import type { Plan } from '@/domain/entities/store'

const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()
const past   = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()

describe('effectivePlan', () => {
  it('returns the stored plan when no grandfather is set', () => {
    expect(effectivePlan({ plan: 'free',     grandfatheredUntil: null })).toBe('free')
    expect(effectivePlan({ plan: 'pro',      grandfatheredUntil: null })).toBe('pro')
    expect(effectivePlan({ plan: 'business', grandfatheredUntil: null })).toBe('business')
  })

  it('elevates a free plan to pro while grandfather is active', () => {
    expect(effectivePlan({ plan: 'free', grandfatheredUntil: future(7) })).toBe('pro')
  })

  it('returns stored plan after grandfather has expired', () => {
    expect(effectivePlan({ plan: 'free', grandfatheredUntil: past(1) })).toBe('free')
  })

  it('never downgrades an already-paid plan during grandfather', () => {
    // A user on Business with an active grandfather window should stay
    // Business — the grandfather is a free perk, not a downgrade.
    expect(effectivePlan({ plan: 'business', grandfatheredUntil: future(30) })).toBe('business')
  })
})

describe('isGrandfatherActive', () => {
  it('true when grandfather is in the future', () => {
    expect(isGrandfatherActive({ grandfatheredUntil: future(1) })).toBe(true)
  })
  it('false when grandfather is null', () => {
    expect(isGrandfatherActive({ grandfatheredUntil: null })).toBe(false)
  })
  it('false when grandfather is in the past', () => {
    expect(isGrandfatherActive({ grandfatheredUntil: past(1) })).toBe(false)
  })
})

describe('grandfatherDaysRemaining', () => {
  it('rounds down to whole days', () => {
    const days = grandfatherDaysRemaining({ grandfatheredUntil: future(3.4) })
    expect(days).toBe(3)
  })
  it('zero when inactive', () => {
    expect(grandfatherDaysRemaining({ grandfatheredUntil: null })).toBe(0)
    expect(grandfatherDaysRemaining({ grandfatheredUntil: past(1) })).toBe(0)
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
