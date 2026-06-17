import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getServerData } from '@/lib/getServerData'
import { RecurringExpenseRepository } from '@/infrastructure/supabase/repositories/RecurringExpenseRepository'
import RestrictedNotice from '@/components/RestrictedNotice'
import RecurringClient from './RecurringClient'

export default async function RecurringSettingsPage() {
  const { supabase, store, role } = await getServerData()
  if (role === 'cashier') {
    return (
      <RestrictedNotice
        title="Recurring expenses are restricted"
        description="Recurring rules drive forecast and P&L — managers and owners only."
      />
    )
  }
  const repo = new RecurringExpenseRepository(supabase)
  const rules = await repo.findAll(store.id).catch(() => [])

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <Link href="/settings" className="inline-flex items-center gap-1.5 text-muted text-sm">
        <ArrowLeft size={14} /> Settings
      </Link>
      <h1 className="text-xl font-bold text-white">Recurring expenses</h1>
      <p className="text-muted text-sm">
        Rules here spawn an expense automatically on schedule — rent, electricity,
        insurance, weekly transport. Used as confirmed outflows in the cash-flow forecast.
      </p>
      <RecurringClient store={store} rules={rules} />
    </div>
  )
}
