import { afterEach, describe, expect, it, vi } from 'vitest'
import { CANONICAL_URLS, INDEXNOW_KEY, submitToIndexNow } from './indexnow'

describe('IndexNow key + canonical URLs', () => {
  it('exports a non-empty hex key that matches the public/.txt filename', () => {
    expect(INDEXNOW_KEY).toMatch(/^[a-f0-9]{16,}$/)
  })

  it('lists every canonical URL under the same stokiapp.com host', () => {
    for (const u of CANONICAL_URLS) {
      expect(u.startsWith('https://stokiapp.com/')).toBe(true)
    }
  })

  it('covers landing, login, privacy, terms, every comparison page, and the VAT201 guide', () => {
    expect(CANONICAL_URLS).toContain('https://stokiapp.com/')
    expect(CANONICAL_URLS).toContain('https://stokiapp.com/compare/stoki-vs-loyverse')
    expect(CANONICAL_URLS).toContain('https://stokiapp.com/compare/stoki-vs-yoco')
    expect(CANONICAL_URLS).toContain('https://stokiapp.com/compare/stoki-vs-xero')
    expect(CANONICAL_URLS).toContain('https://stokiapp.com/compare/stoki-vs-sage')
    expect(CANONICAL_URLS).toContain('https://stokiapp.com/compare/stoki-vs-ikhokha')
    expect(CANONICAL_URLS).toContain('https://stokiapp.com/guides/how-to-submit-vat201-south-africa')
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
