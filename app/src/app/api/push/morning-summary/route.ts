import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/infrastructure/supabase/admin'

/**
 * Morning push — fired ~08:00 SAST. Surfaces "what to know before you open
 * the till": yesterday's headline number, the day's hottest seller (so the
 * owner knows what to restock), and a low-stock count.
 *
 * Skipped silently for stores with nothing to say (no sales yesterday and
 * no low stock) — better no notification than a notification with no signal.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = req.headers.get('x-vercel-cron') ? true : false
  const validBearer = authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
  const validCron = cronSecret || (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`)

  if (!validBearer && !validCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:hello@stoki.app',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )

  const supabase = createAdminClient()

  const { data: subs } = await supabase.from('push_subscriptions').select('*')
  if (!subs || subs.length === 0) return NextResponse.json({ sent: 0 })

  const storeIds = [...new Set(subs.map((s: { store_id: string }) => s.store_id))]

  // Yesterday window — full 24 hours ending at midnight today.
  const now = new Date()
  const yStart = new Date(now); yStart.setDate(yStart.getDate() - 1); yStart.setHours(0, 0, 0, 0)
  const yEnd = new Date(now);   yEnd.setDate(yEnd.getDate() - 1);     yEnd.setHours(23, 59, 59, 999)

  let sent = 0
  let skipped = 0
  for (const storeId of storeIds) {
    const { data: sales } = await supabase
      .from('sales')
      .select('qty, price_at_sale, products(name)')
      .eq('store_id', storeId)
      .gte('recorded_at', yStart.toISOString())
      .lte('recorded_at', yEnd.toISOString())

    const revenue = (sales ?? []).reduce(
      (s: number, r: { qty: number; price_at_sale: number }) => s + r.qty * r.price_at_sale,
      0,
    )

    // Top seller by qty — captures what the shop should restock first.
    // PostgREST returns joined relations as arrays even for 1:1, so peel
    // off the first element defensively.
    const byProduct = new Map<string, number>()
    for (const r of (sales ?? []) as Array<{ qty: number; products: Array<{ name: string }> | { name: string } | null }>) {
      const name = Array.isArray(r.products) ? r.products[0]?.name : r.products?.name
      if (!name) continue
      byProduct.set(name, (byProduct.get(name) ?? 0) + r.qty)
    }
    const topSeller = [...byProduct.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    // Low / out-of-stock count — what's at risk today.
    const { data: products } = await supabase
      .from('products')
      .select('qty, reorder_point')
      .eq('store_id', storeId)
      .is('deleted_at', null)
    const lowStock = (products ?? []).filter(
      (p: { qty: number; reorder_point: number }) => p.qty <= (p.reorder_point ?? 0),
    ).length

    // Nothing useful to say → skip this store entirely. Empty pushes train the
    // user to ignore us; staying silent on quiet days protects the signal.
    if (revenue === 0 && lowStock === 0 && !topSeller) {
      skipped++
      continue
    }

    const { data: store } = await supabase
      .from('stores')
      .select('name')
      .eq('id', storeId)
      .single()
    const storeName = store?.name ?? 'Your store'

    const parts: string[] = []
    if (revenue > 0) parts.push(`Yesterday R${revenue.toFixed(0)}`)
    if (topSeller) parts.push(`top: ${topSeller}`)
    if (lowStock > 0) parts.push(`${lowStock} low stock`)

    const summaryBody = parts.join(' · ')
    const payload = JSON.stringify({
      title: `Good morning — ${storeName}`,
      body: summaryBody,
      url: '/dashboard',
    })

    // Persist as in-app alert so the morning briefing survives a missed push.
    await supabase.from('alerts').insert({
      store_id: storeId,
      type: 'ai_insight',
      message: `Good morning — ${summaryBody}`,
    })

    const storeSubs = subs.filter((s: { store_id: string }) => s.store_id === storeId)
    for (const sub of storeSubs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
        sent++
      } catch {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }

  return NextResponse.json({ sent, skipped })
}

export async function GET(req: Request) {
  return POST(req)
}
