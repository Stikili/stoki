import { describe, expect, it } from 'vitest'
import { bundleCost, bundlesAvailable } from './bundle'

describe('bundleCost', () => {
  it('sums component qty × cost across the bundle', () => {
    expect(bundleCost([
      { qty: 1, componentCost: 10 },
      { qty: 2, componentCost: 5 },
      { qty: 1, componentCost: 3 },
    ])).toBe(23)
  })

  it('treats missing cost as 0', () => {
    expect(bundleCost([{ qty: 1, componentCost: null }])).toBe(0)
  })

  it('returns 0 for an empty bundle', () => {
    expect(bundleCost([])).toBe(0)
  })
})

describe('bundlesAvailable', () => {
  it('is bounded by the scarcest component (integer division)', () => {
    // 8 / 2 = 4 bundles; 5 / 1 = 5 bundles → min = 4
    expect(bundlesAvailable([
      { qty: 2, componentQty: 8 },
      { qty: 1, componentQty: 5 },
    ])).toBe(4)
  })

  it('floors fractional ratios — half a sandwich is not a usable bundle', () => {
    expect(bundlesAvailable([{ qty: 2, componentQty: 5 }])).toBe(2)
  })

  it('returns 0 when any component is out of stock', () => {
    expect(bundlesAvailable([
      { qty: 1, componentQty: 10 },
      { qty: 1, componentQty: 0 },
    ])).toBe(0)
  })

  it('returns Infinity for an empty (unconfigured) bundle', () => {
    expect(bundlesAvailable([])).toBe(Infinity)
  })

  it('skips components with null qty (component data missing)', () => {
    expect(bundlesAvailable([
      { qty: 1, componentQty: 10 },
      { qty: 1, componentQty: null },
    ])).toBe(10)
  })
})
