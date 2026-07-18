import { NextResponse } from 'next/server'
import { CANONICAL_URLS, submitToIndexNow } from '@/lib/indexnow'
import { log } from '@/lib/log'
import { rateLimitByIp } from '@/lib/rate-limit'

/**
 * POST /api/indexnow — ping Bing/Yandex/Naver via IndexNow.
 *
 * Two modes:
 *   POST /api/indexnow?all=1        → submit every canonical URL
 *   POST /api/indexnow  {urls:[...]} → submit specific URLs
 *
 * Auth: Bearer CRON_SECRET (or x-vercel-cron header when Vercel
 * schedules it). Keeps random visitors from burning our submission
 * quota with garbage URLs.
 *
 * When to hit this:
 *   - After deploying a new comparison page or blog post → ?url=/compare/...
 *   - Occasionally to remind Bing about updated pages → ?all=1
 *
 * IndexNow docs warn against spamming unchanged URLs — engines throttle
 * senders that do. Only call when content genuinely changed.
 */
export async function POST(req: Request) {
  const ipBlock = await rateLimitByIp(req, 'indexnow', 30)
  if (ipBlock) return ipBlock

  if (!authorise(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const submitAll = url.searchParams.get('all') === '1'

  let urls: string[] = []
  if (submitAll) {
    urls = CANONICAL_URLS
  } else {
    // Accept either { urls: string[] } OR ?url=… (repeatable). Both are
    // fine — the query-string form is friendly for a quick curl after
    // deploy; the body form is friendly for programmatic pinging.
    const qsUrls = url.searchParams.getAll('url')
    if (qsUrls.length > 0) {
      urls = qsUrls
    } else {
      try {
        const body = await req.json() as { urls?: string[] }
        urls = Array.isArray(body.urls) ? body.urls : []
      } catch { /* empty body — nothing to submit */ }
    }
  }

  if (urls.length === 0) {
    return NextResponse.json({ error: 'No URLs supplied — use ?all=1 or ?url=… or POST {urls:[...]}' }, { status: 400 })
  }

  const result = await submitToIndexNow(urls)
  log.info('indexnow.submit', {
    submitted: urls.length,
    accepted: result.accepted,
    status: result.status,
    ok: result.ok,
  })
  return NextResponse.json(result, { status: result.ok ? 200 : 502 })
}

/** GET aliased to POST so a browser-visited debug URL still works. */
export async function GET(req: Request) { return POST(req) }

function authorise(req: Request): boolean {
  const authHeader = req.headers.get('authorization')
  if (req.headers.get('x-vercel-cron')) return true
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) return true
  if (authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) return true
  return false
}
