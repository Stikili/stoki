import { describe, expect, it } from 'vitest'
import {
  AI_TONES,
  DEFAULT_AI_TONE,
  isValidAiTone,
  toneInstruction,
} from './ai-tone'

describe('AI tone catalogue', () => {
  it('exposes exactly four tones in the correct order', () => {
    expect(AI_TONES.map(t => t.key)).toEqual(['casual', 'plain', 'professional', 'technical'])
  })

  it('every tone has a label, description, and preview', () => {
    for (const t of AI_TONES) {
      expect(t.label.trim().length).toBeGreaterThan(0)
      expect(t.description.trim().length).toBeGreaterThan(0)
      expect(t.preview.trim().length).toBeGreaterThan(0)
    }
  })

  it('defaults to plain — the register existing users are on', () => {
    expect(DEFAULT_AI_TONE).toBe('plain')
    expect(AI_TONES.some(t => t.key === DEFAULT_AI_TONE)).toBe(true)
  })
})

describe('isValidAiTone', () => {
  it('accepts each catalogue value', () => {
    for (const t of AI_TONES) expect(isValidAiTone(t.key)).toBe(true)
  })

  it('rejects unknown, empty, or non-string values', () => {
    expect(isValidAiTone('formal')).toBe(false)
    expect(isValidAiTone('')).toBe(false)
    expect(isValidAiTone(null)).toBe(false)
    expect(isValidAiTone(undefined)).toBe(false)
    expect(isValidAiTone(0)).toBe(false)
    expect(isValidAiTone({})).toBe(false)
  })
})

describe('toneInstruction', () => {
  it('returns a non-empty instruction block for every tone', () => {
    for (const t of AI_TONES) {
      const block = toneInstruction(t.key)
      expect(block.length).toBeGreaterThan(20)
      expect(block).toContain('TONE')
    }
  })

  it('casual mentions kasi vocabulary explicitly', () => {
    const block = toneInstruction('casual')
    expect(block.toLowerCase()).toMatch(/howzit|yebo|boss|kasi/)
  })

  it('plain forbids accounting jargon by name', () => {
    const block = toneInstruction('plain')
    expect(block).toMatch(/COGS/)
  })

  it('technical explicitly permits COGS and GP terminology', () => {
    const block = toneInstruction('technical')
    // Technical should mention the jargon it enables, not forbid it
    expect(block.toLowerCase()).toContain('cogs')
    expect(block.toLowerCase()).toMatch(/gross margin|gp%/)
  })

  it('professional stakes a middle ground — no kasi slang, no heavy jargon', () => {
    const block = toneInstruction('professional')
    expect(block.toLowerCase()).not.toMatch(/howzit|yebo/)
    // Professional still restricts the heaviest terms
    expect(block).toMatch(/COGS/)
  })

  it('each tone produces a distinct instruction block', () => {
    const blocks = AI_TONES.map(t => toneInstruction(t.key))
    const unique = new Set(blocks)
    expect(unique.size).toBe(AI_TONES.length)
  })
})
