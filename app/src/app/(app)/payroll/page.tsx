import { getServerData } from '@/lib/getServerData'
import { PayrollRepository } from '@/infrastructure/supabase/repositories/PayrollRepository'
import RestrictedNotice from '@/components/RestrictedNotice'
import LockedFeatureNotice from '@/components/LockedFeatureNotice'
import { hasFeature } from '@/lib/plan-gates'
import PayrollClient from './PayrollClient'
import { endOfMonth } from '@/domain/entities/fixed-asset'

export default async function PayrollPage() {
  const { supabase, store, role } = await getServerData()
  if (role !== 'owner') {
    return (
      <RestrictedNotice
        title="Payroll is restricted"
        description="Payroll is owner-only — it touches PAYE, UIF and SDL submissions to SARS."
      />
    )
  }
  if (!hasFeature(store, 'payroll.run')) {
    return <LockedFeatureNotice gate="payroll.run" />
  }

  const repo = new PayrollRepository(supabase)
  const now = new Date()
  const currentPeriod = endOfMonth(now).toISOString().slice(0, 10)

  const [employees, runs, currentRun] = await Promise.all([
    repo.findEmployees(store.id).catch(() => []),
    repo.findRuns(store.id).catch(() => []),
    repo.findRunForPeriod(store.id, currentPeriod).catch(() => null),
  ])

  return (
    <div className="px-4 pt-6 pb-4">
      <PayrollClient
        employees={employees}
        runs={runs}
        currentPeriod={currentPeriod}
        currentRun={currentRun}
      />
    </div>
  )
}
