import { describe, expect, it } from 'vitest'
import { resolveBodyParams } from './whatsapp-broadcast'

describe('resolveBodyParams', () => {
  it('substitutes {{name}} into params', () => {
    expect(resolveBodyParams(['Hi {{name}}'], { name: 'Alice', phone: '27821234567' }))
      .toEqual(['Hi Alice'])
  })

  it('substitutes {{phone}} into params', () => {
    expect(resolveBodyParams(['Reply to {{phone}}'], { name: 'A', phone: '27821234567' }))
      .toEqual(['Reply to 27821234567'])
  })

  it('replaces every occurrence in a single param', () => {
    expect(resolveBodyParams(['{{name}}, hi {{name}}!'], { name: 'Bo', phone: '0' }))
      .toEqual(['Bo, hi Bo!'])
  })

  it('leaves unknown placeholders untouched', () => {
    // Meta's API will reject the send rather than us guessing — we want a
    // visible error rather than silently sending "{{order_id}}" to customers.
    expect(resolveBodyParams(['Order {{order_id}}'], { name: 'A', phone: '0' }))
      .toEqual(['Order {{order_id}}'])
  })

  it('returns the params array unchanged when no placeholders are used', () => {
    expect(resolveBodyParams(['Static one', 'Static two'], { name: 'A', phone: '0' }))
      .toEqual(['Static one', 'Static two'])
  })

  it('handles an empty params list', () => {
    expect(resolveBodyParams([], { name: 'A', phone: '0' })).toEqual([])
  })
})
