import { getServerData } from '@/lib/getServerData'
import { AlertRepository } from '@/infrastructure/supabase/repositories/AlertRepository'
import AlertsClient from './AlertsClient'

export default async function AlertsPage() {
  const { supabase, store } = await getServerData()
  const alertRepo = new AlertRepository(supabase)
  const alerts = await alertRepo.findAll(store.id)

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-xl font-bold text-white mb-1">Alerts</h1>
      <p className="text-muted text-sm mb-6">Everything that needs your attention</p>
      <AlertsClient alerts={alerts} />
    </div>
  )
}
