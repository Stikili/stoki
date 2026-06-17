import { NextResponse } from 'next/server'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { ExpenseRepository } from '@/infrastructure/supabase/repositories/ExpenseRepository'
import { RecurringExpenseRepository } from '@/infrastructure/supabase/repositories/RecurringExpenseRepository'
import { postDueRecurringExpenses } from '@/application/expenses/postDueRecurringExpenses'

/**
 * Daily cron — spawn an expense row for every recurring rule that's fallen
 * due across every store. Run via Vercel cron or external scheduler (Railway).
 *
 * Idempotent: each rule's next_due_at advances after posting, so duplicate
 * firings within the same window are no-ops. /expenses also posts lazily
 * on load as a backstop when this cron is dark.
 */
export async function POST(req: Request) {
  if (!authorise(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const expenseRepo = new ExpenseRepository(supabase)
  const recurringRepo = new RecurringExpenseRepository(supabase)
  const now = new Date()

  // Pull every store with at least one active rule whose next_due_at has
  // passed. Iterate per store so the admin client respects each store's
  // row context cleanly.
  const { data: dueRules, error } = await supabase
    .from('recurring_expenses')
    .select('store_id')
    .eq('active', true)
    .is('deleted_at', null)
    .lte('next_due_at', now.toISOString())
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const storeIds = [...new Set((dueRules ?? []).map((r) => r.store_id as string))]
  let totalPosted = 0
  const perStore: { storeId: string; posted: number; error?: string }[] = []

  for (const storeId of storeIds) {
    try {
      const { posted } = await postDueRecurringExpenses(storeId, expenseRepo, recurringRepo, now)
      totalPosted += posted
      perStore.push({ storeId, posted })
    } catch (e) {
      perStore.push({ storeId, posted: 0, error: errMsg(e) })
    }
  }

  return NextResponse.json({ totalPosted, stores: perStore })
}

export async function GET(req: Request) {
  return POST(req)
}

function authorise(req: Request): boolean {
  const authHeader = req.headers.get('authorization')
  const cronHeader = req.headers.get('x-vercel-cron')
  if (cronHeader) return true
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) return true
  if (authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) return true
  return false
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
