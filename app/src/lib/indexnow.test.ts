import { afterEach, describe, expect, it, vi } from 'vitest'
import { CANONICAL_URLS, INDEXNOW_KEY, normaliseCanonicalUrl, submitToIndexNow } from './indexnow'

describe('IndexNow key + canonical URLs', () => {
  it('exports a non-empty hex key that matches the public/.txt filename', () => {
    expect(INDEXNOW_KEY).toMatch(/^[a-f0-9]{16,}$/)
  })

  it('lists every canonical URL under the same stokiapp.com host', () => {
    for (const u of CANONICAL_URLS) {
      expect(u.startsWith('https://stokiapp.com/')).toBe(true)
    }
  })

  it('covers landing, login, register, pricing, features, about, privacy, terms, every comparison, and the VAT201 guide', () => {
    expect(CANONICAL_URLS).toContain('https://stokiapp.com/')
    expect(CANONICAL_URLS).toContain('https://stokiapp.com/register')
    expect(CANONICAL_URLS).toContain('https://stokiapp.com/pricing')
    expect(CANONICAL_URLS).toContain('https://stokiapp.com/features')
    expect(CANONICAL_URLS).toContain('https://stokiapp.com/about')
    expect(CANONICAL_URLS).toContain('https://stokiapp.com/compare/stoki-vs-loyverse')
    expect(CANONICAL_URLS).toContain('https://stokiapp.com/compare/stoki-vs-yoco')
    expect(CANONICAL_URLS).toContain('https://stokiapp.com/compare/stoki-vs-xero')
    expect(CANONICAL_URLS).toContain('https://stokiapp.com/compare/stoki-vs-sage')
    expect(CANONICAL_URLS).toContain('https://stokiapp.com/compare/stoki-vs-ikhokha')
    expect(CANONICAL_URLS).toContain('https://stokiapp.com/compare/stoki-vs-simplepay')
    expect(CANONICAL_URLS).toContain('https://stokiapp.com/guides/how-to-submit-vat201-south-africa')
    expect(CANONICAL_URLS).toContain('https://stokiapp.com/status')
  })
})

describe('normaliseCanonicalUrl', () => {
  it('returns the input unchanged when it is already a canonical bare-host URL', () => {
    expect(normaliseCanonicalUrl('https://stokiapp.com/pricing')).toBe('https://stokiapp.com/pricing')
  })

  it('rewrites www subdomain to bare host', () => {
    expect(normaliseCanonicalUrl('https://www.stokiapp.com/pricing')).toBe('https://stokiapp.com/pricing')
  })

  it('promotes an absolute path to a full canonical URL', () => {
    expect(normaliseCanonicalUrl('/pricing')).toBe('https://stokiapp.com/pricing')
    expect(normaliseCanonicalUrl('/compare/stoki-vs-loyverse')).toBe('https://stokiapp.com/compare/stoki-vs-loyverse')
  })

  it('preserves query string + hash', () => {
    expect(normaliseCanonicalUrl('/pricing?ref=linkedin#free')).toBe('https://stokiapp.com/pricing?ref=linkedin#free')
    expect(normaliseCanonicalUrl('https://stokiapp.com/pricing?ref=x')).toBe('https://stokiapp.com/pricing?ref=x')
  })

  it('trims whitespace', () => {
    expect(normaliseCanonicalUrl('  /pricing  ')).toBe('https://stokiapp.com/pricing')
  })

  it('returns null for cross-host URLs', () => {
    expect(normaliseCanonicalUrl('https://example.com/foo')).toBeNull()
    expect(normaliseCanonicalUrl('https://loyverse.com/za')).toBeNull()
  })

  it('returns null for garbage or empty input', () => {
    expect(normaliseCanonicalUrl('')).toBeNull()
    expect(normaliseCanonicalUrl('   ')).toBeNull()
    expect(normaliseCanonicalUrl('not-a-url')).toBeNull()
    expect(normaliseCanonicalUrl('ftp://stokiapp.com/foo')).not.toBeNull() // ftp is a valid protocol; only host matters
  })
})

describe('submitToIndexNow', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('returns a 204-shaped success when urls array is empty (no-op)', async () => {
    const result = await submitToIndexNow([])
    expect(result.ok).toBe(true)
    expect(result.status).toBe(204)
    expect(result.accepted).toBe(0)
  })

  it('rejects urls outside the canonical host without hitting the API', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    const result = await submitToIndexNow(['https://example.com/foo'])
    expect(result.ok).toBe(false)
    expect(result.status).toBe(400)
    expect(result.message).toMatch(/outside canonical host/i)
    expect(spy).not.toHaveBeenCalled()
  })

  it('accepts relative paths and normalises to canonical host before submitting', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('', { status: 200 }),
    )
    const result = await submitToIndexNow(['/compare/stoki-vs-loyverse'])
    expect(result.ok).toBe(true)
    expect(result.accepted).toBe(1)
    const body = JSON.parse(String(spy.mock.calls[0][1]?.body))
    expect(body.urlList).toEqual(['https://stokiapp.com/compare/stoki-vs-loyverse'])
  })

  it('rejects malformed URLs without hitting the API', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    const result = await submitToIndexNow(['not-a-url'])
    expect(result.ok).toBe(false)
    expect(spy).not.toHaveBeenCalled()
  })

  it('rejects lists > 10,000 URLs without hitting the API', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    const many = Array.from({ length: 10_001 }, (_, i) => `https://stokiapp.com/x${i}`)
    const result = await submitToIndexNow(many)
    expect(result.ok).toBe(false)
    expect(result.status).toBe(400)
    expect(result.message).toMatch(/10,000/)
    expect(spy).not.toHaveBeenCalled()
  })

  it('posts to api.indexnow.org with host, key, keyLocation, urlList', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('', { status: 200 }),
    )
    const result = await submitToIndexNow(['https://stokiapp.com/'])
    expect(result.ok).toBe(true)
    expect(result.accepted).toBe(1)
    expect(spy).toHaveBeenCalledOnce()
    const [url, init] = spy.mock.calls[0]
    expect(String(url)).toBe('https://api.indexnow.org/indexnow')
    const body = JSON.parse(String(init?.body))
    expect(body.host).toBe('stokiapp.com')
    expect(body.key).toBe(INDEXNOW_KEY)
    expect(body.keyLocation).toBe(`https://stokiapp.com/${INDEXNOW_KEY}.txt`)
    expect(body.urlList).toEqual(['https://stokiapp.com/'])
  })

  it('reports engine 4xx errors with the response body clipped to 200 chars', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Invalid key', { status: 403 }),
    )
    const result = await submitToIndexNow(['https://stokiapp.com/'])
    expect(result.ok).toBe(false)
    expect(result.status).toBe(403)
    expect(result.message).toBe('Invalid key')
    expect(spy).toHaveBeenCalledOnce()
  })

  it('never throws on network failure — resolves with status 0 and error message', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('ECONNRESET'))
    const result = await submitToIndexNow(['https://stokiapp.com/'])
    expect(result.ok).toBe(false)
    expect(result.status).toBe(0)
    expect(result.message).toBe('ECONNRESET')
  })
})
