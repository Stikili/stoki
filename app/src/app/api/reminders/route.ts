import { NextResponse } from 'next/server'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { sendWhatsApp } from '@/lib/twilio'

// Cron: sends WhatsApp reminders to overdue debtors (3-day cooldown)
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = req.headers.get('x-vercel-cron') ? true : false
  const validBearer = authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
  const validCron = cronSecret || (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`)

  if (!validBearer && !validCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.TWILIO_ACCOUNT_SID) {
    return NextResponse.json({ error: 'Twilio not configured', reminded: 0 })
  }

  const supabase = createAdminClient()
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  // Get overdue debtors with phone numbers, not reminded in last 3 days
  const { data: debtors } = await supabase
    .from('debtors')
    .select('id, store_id, name, phone, total_owed, last_reminded_at')
    .gt('total_owed', 0)
    .not('phone', 'is', null)
    .is('deleted_at', null)
    .or(`last_reminded_at.is.null,last_reminded_at.lt.${threeDaysAgo}`)

  if (!debtors || debtors.length === 0) {
    return NextResponse.json({ reminded: 0 })
  }

  // Get store names
  const storeIds = [...new Set(debtors.map(d => d.store_id))]
  const { data: stores } = await supabase
    .from('stores')
    .select('id, name')
    .in('id', storeIds)

  const storeMap = new Map((stores ?? []).map(s => [s.id, s.name]))

  let reminded = 0
  for (const debtor of debtors) {
    const storeName = storeMap.get(debtor.store_id) ?? 'Your store'
    const msg = `Hi ${debtor.name}, friendly reminder: you owe R${Number(debtor.total_owed).toFixed(2)} at ${storeName}. Thank you!`

    try {
      await sendWhatsApp(debtor.phone, msg)
      await supabase
        .from('debtors')
        .update({ last_reminded_at: new Date().toISOString() })
        .eq('id', debtor.id)
      reminded++
    } catch {
      // Skip failed sends (invalid number, etc.)
    }
  }

  return NextResponse.json({ reminded })
}

// Vercel crons call GET
export async function GET(req: Request) {
  return POST(req)
}
