import { getServerData } from '@/lib/getServerData'
import { SupplierRepository } from '@/infrastructure/supabase/repositories/SupplierRepository'
import { RestockRepository } from '@/infrastructure/supabase/repositories/RestockRepository'
import SuppliersClient from './SuppliersClient'

export default async function SuppliersPage() {
  const { supabase, store } = await getServerData()

  const supplierRepo = new SupplierRepository(supabase)
  const restockRepo = new RestockRepository(supabase)

  const now = new Date()
  const ninetyDaysAgo = new Date(now); ninetyDaysAgo.setDate(now.getDate() - 90)

  // Pre-migration-006 fallback so the app still loads if the SQL hasn't been applied yet.
  const [suppliers, recentRestocks] = await Promise.all([
    supplierRepo.findAll(store.id).catch(() => []),
    restockRepo.findByPeriod(store.id, ninetyDaysAgo, now).catch(() => []),
  ])

  // Aggregate per supplier — total spend in last 90 days + last delivery date.
  const stats: Record<string, { spend: number; lastDelivery: string | null; count: number }> = {}
  for (const r of recentRestocks) {
    if (!r.supplierId) continue
    const s = stats[r.supplierId] ?? { spend: 0, lastDelivery: null, count: 0 }
    s.spend += (r.cost ?? 0) * r.qtyAdded
    s.count += 1
    if (!s.lastDelivery || r.recordedAt > s.lastDelivery) s.lastDelivery = r.recordedAt
    stats[r.supplierId] = s
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <SuppliersClient suppliers={suppliers} stats={stats} />
    </div>
  )
}
