import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/infrastructure/supabase/admin'

// Called by a cron job at 18:00 SAST to send daily summary push to all subscribers
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
    process.env.VAPID_PRIVATE_KEY!
  )

  const supabase = createAdminClient()

  // Get all stores with subscriptions
  const { data: subs } = await supabase.from('push_subscriptions').select('*')
  if (!subs || subs.length === 0) return NextResponse.json({ sent: 0 })

  // Group by store
  const storeIds = [...new Set(subs.map((s: { store_id: string }) => s.store_id))]

  let sent = 0
  for (const storeId of storeIds) {
    // Today's sales
    const now = new Date()
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999)

    const { data: sales } = await supabase
      .from('sales')
      .select('qty, price_at_sale')
      .eq('store_id', storeId)
      .gte('recorded_at', dayStart.toISOString())
      .lte('recorded_at', dayEnd.toISOString())

    const revenue = (sales ?? []).reduce((s: number, r: { qty: number; price_at_sale: number }) => s + r.qty * r.price_at_sale, 0)
    const txCount = (sales ?? []).length
    const items = (sales ?? []).reduce((s: number, r: { qty: number }) => s + r.qty, 0)

    const { data: store } = await supabase.from('stores').select('name').eq('id', storeId).single()
    const storeName = store?.name ?? 'Your store'

    const payload = JSON.stringify({
      title: `${storeName} — End of Day`,
      body: `R${revenue.toFixed(2)} revenue · ${txCount} sales · ${items} items sold`,
      url: '/dashboard',
    })

    const storeSubs = subs.filter((s: { store_id: string }) => s.store_id === storeId)
    for (const sub of storeSubs) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        }, payload)
        sent++
      } catch {
        // Remove expired subscriptions
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }

  return NextResponse.json({ sent })
}

// Vercel crons call GET
export async function GET(req: Request) {
  return POST(req)
}
