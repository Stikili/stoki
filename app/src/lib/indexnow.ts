/**
 * IndexNow client — pings Bing, Yandex, Naver, Seznam (and any other
 * IndexNow-compliant search engine) the moment content changes.
 *
 * Not for Google — Google runs their own protocol (Search Console URL
 * inspection or a direct sitemap ping). Everything else that anyone in
 * SA actually uses (Bing, DuckDuckGo via Bing, ChatGPT search via Bing)
 * respects IndexNow.
 *
 * Ownership proof: `<key>.txt` at the domain root must return the same
 * key string in its body. The value + file are stable in this repo:
 *   - key value: INDEXNOW_KEY constant below
 *   - file:      app/public/<INDEXNOW_KEY>.txt
 * Rotating the key means: (1) generate a new hex string, (2) update the
 * constant, (3) rename the public/ file. Rare — do it only if the key
 * leaks or you want to move ownership between accounts.
 */

/** IndexNow ownership key. MUST match the filename of the .txt file
 *  hosted at `public/<key>.txt` — the search engine fetches that URL to
 *  verify the submitter owns the domain. */
export const INDEXNOW_KEY = 'd7c2f8e5a1b394f6e0c7a2b5d8f1e4c3'

/** Central IndexNow endpoint. api.indexnow.org fans the ping out to
 *  every participating engine (Bing, Yandex, Naver, Seznam, plus any
 *  future additions) — no need to hit each engine individually. */
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'

/** Preferred protocol + host for the site's canonical URLs. Passed as
 *  the `host` field in the IndexNow POST body — some engines reject
 *  submissions where host doesn't match the URL in the urlList. */
const CANONICAL_HOST = 'stokiapp.com'

export interface SubmitResult {
  ok: boolean
  status: number
  /** Number of URLs the engine accepted. Set from the response body when
   *  the engine returns a JSON breakdown; otherwise equal to urlList length
   *  on success. */
  accepted: number
  /** Human-facing note when the engine explains a rejection. */
  message?: string
}

/**
 * Submit a list of URLs to IndexNow. Batches up to 10,000 URLs per POST
 * (IndexNow's documented cap); this app never hits that, but the guard
 * is here for future-proofing.
 *
 * Returns a shape the caller can log/report. Never throws — network
 * failures resolve to `{ok: false, status: 0, accepted: 0, message}` so
 * callers can chain multiple pings without try/catch scaffolding.
 */
export async function submitToIndexNow(urls: string[]): Promise<SubmitResult> {
  if (urls.length === 0) return { ok: true, status: 204, accepted: 0 }
  if (urls.length > 10_000) {
    return { ok: false, status: 400, accepted: 0, message: 'urlList exceeds IndexNow 10,000 cap' }
  }

  // Every URL must belong to CANONICAL_HOST — cross-host submissions
  // are rejected as "unrelated URL" by every engine, so validate up-
  // front rather than sending garbage to the API.
  const alien = urls.filter(u => {
    try { return new URL(u).host !== CANONICAL_HOST } catch { return true }
  })
  if (alien.length > 0) {
    return {
      ok: false, status: 400, accepted: 0,
      message: `urls outside canonical host: ${alien.slice(0, 3).join(', ')}${alien.length > 3 ? '…' : ''}`,
    }
  }

  const body = {
    host: CANONICAL_HOST,
    key: INDEXNOW_KEY,
    keyLocation: `https://${CANONICAL_HOST}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  }

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      // 200 = accepted, 202 = accepted (queued), both are wins. Some
      // engines return an empty body; treat that as "all accepted".
      return { ok: true, status: res.status, accepted: urls.length }
    }

    // 400 = bad request (bad key, unrelated URL, malformed body)
    // 403 = key file missing / mismatched
    // 422 = URLs don't belong to host
    // 429 = rate-limited (usually because we're spamming unchanged URLs)
    const text = await res.text().catch(() => '')
    return {
      ok: false,
      status: res.status,
      accepted: 0,
      message: text.slice(0, 200) || `IndexNow ${res.status}`,
    }
  } catch (e) {
    return {
      ok: false, status: 0, accepted: 0,
      message: e instanceof Error ? e.message : 'network error',
    }
  }
}

/** The site's canonical public URLs — mirror sitemap.ts. Kept here so
 *  scripts / cron routes can ping the full set without importing the
 *  MetadataRoute (Node vs Edge runtime mismatch). Update in lockstep
 *  when adding new public pages. */
export const CANONICAL_URLS: string[] = [
  `https://${CANONICAL_HOST}/`,
  `https://${CANONICAL_HOST}/login`,
  `https://${CANONICAL_HOST}/register`,
  `https://${CANONICAL_HOST}/pricing`,
  `https://${CANONICAL_HOST}/privacy`,
  `https://${CANONICAL_HOST}/terms`,
  `https://${CANONICAL_HOST}/compare/stoki-vs-loyverse`,
  `https://${CANONICAL_HOST}/compare/stoki-vs-yoco`,
  `https://${CANONICAL_HOST}/compare/stoki-vs-xero`,
  `https://${CANONICAL_HOST}/compare/stoki-vs-sage`,
  `https://${CANONICAL_HOST}/compare/stoki-vs-ikhokha`,
  `https://${CANONICAL_HOST}/guides/how-to-submit-vat201-south-africa`,
]
