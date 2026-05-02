import crypto from 'crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  normalizeZAPhone,
  validateMetaSignature,
  extractIncomingMessage,
} from './whatsapp'

describe('normalizeZAPhone', () => {
  it('strips non-digit characters', () => {
    expect(normalizeZAPhone('+27 82 123 4567')).toBe('27821234567')
  })

  it('replaces leading 0 with 27 (SA country code)', () => {
    expect(normalizeZAPhone('0821234567')).toBe('27821234567')
  })

  it('keeps already-international numbers unchanged', () => {
    expect(normalizeZAPhone('27821234567')).toBe('27821234567')
  })

  it('handles + prefix', () => {
    expect(normalizeZAPhone('+27821234567')).toBe('27821234567')
  })

  it('strips spaces, dashes, parens', () => {
    expect(normalizeZAPhone('082-123-4567')).toBe('27821234567')
    expect(normalizeZAPhone('(082) 123 4567')).toBe('27821234567')
  })

  it('returns empty string for input with no digits', () => {
    expect(normalizeZAPhone('')).toBe('')
    expect(normalizeZAPhone('---')).toBe('')
  })
})

describe('validateMetaSignature', () => {
  const SECRET = 'test-secret'

  beforeEachStubSecret()

  function beforeEachStubSecret() {
    afterEach(() => {
      vi.unstubAllEnvs()
    })
  }

  function sign(body: string): string {
    return 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex')
  }

  it('returns true for a correctly signed payload', () => {
    vi.stubEnv('META_APP_SECRET', SECRET)
    const body = '{"hello":"world"}'
    expect(validateMetaSignature(body, sign(body))).toBe(true)
  })

  it('returns false for a tampered payload', () => {
    vi.stubEnv('META_APP_SECRET', SECRET)
    const body = '{"hello":"world"}'
    const sig = sign(body)
    const tampered = '{"hello":"WORLD"}'
    expect(validateMetaSignature(tampered, sig)).toBe(false)
  })

  it('returns false when signature header is null', () => {
    vi.stubEnv('META_APP_SECRET', SECRET)
    expect(validateMetaSignature('body', null)).toBe(false)
  })

  it('returns false when secret is unset', () => {
    vi.stubEnv('META_APP_SECRET', '')
    expect(validateMetaSignature('body', 'sha256=abc')).toBe(false)
  })

  it('returns false on length mismatch (cheap reject before crypto compare)', () => {
    vi.stubEnv('META_APP_SECRET', SECRET)
    expect(validateMetaSignature('body', 'sha256=short')).toBe(false)
  })

  it('rejects a tampered payload regardless of NODE_ENV', () => {
    // Webhook caller must validate whenever META_APP_SECRET is set, not gate on
    // NODE_ENV=production (the previous bug let staging accept any payload).
    vi.stubEnv('META_APP_SECRET', SECRET)
    vi.stubEnv('NODE_ENV', 'development')
    expect(validateMetaSignature('tampered', sign('original'))).toBe(false)
  })
})

describe('extractIncomingMessage', () => {
  function makePayload(message: object) {
    return {
      entry: [{
        changes: [{
          value: { messages: [message] },
        }],
      }],
    }
  }

  it('extracts a text message from a Meta webhook payload', () => {
    const payload = makePayload({
      from: '27821234567',
      id: 'wamid.ABC',
      type: 'text',
      text: { body: 'sell bread 3' },
    })
    expect(extractIncomingMessage(payload)).toEqual({
      from: '27821234567',
      text: 'sell bread 3',
      messageId: 'wamid.ABC',
    })
  })

  it('returns null for a non-text message (e.g. image)', () => {
    const payload = makePayload({
      from: '27821234567',
      id: 'wamid.IMG',
      type: 'image',
      image: { id: 'media-id' },
    })
    expect(extractIncomingMessage(payload)).toBeNull()
  })

  it('returns null for a delivery/status payload (no messages array)', () => {
    const payload = {
      entry: [{
        changes: [{
          value: { statuses: [{ id: 'wamid.S', status: 'delivered' }] },
        }],
      }],
    }
    expect(extractIncomingMessage(payload)).toBeNull()
  })

  it('returns null for a missing or malformed payload', () => {
    expect(extractIncomingMessage(null)).toBeNull()
    expect(extractIncomingMessage({})).toBeNull()
    expect(extractIncomingMessage({ entry: [] })).toBeNull()
  })

  it('returns null when text body is missing', () => {
    const payload = makePayload({
      from: '27821234567',
      id: 'wamid.X',
      type: 'text',
    })
    expect(extractIncomingMessage(payload)).toBeNull()
  })
})
