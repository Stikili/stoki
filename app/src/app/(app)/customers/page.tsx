import { getServerData } from '@/lib/getServerData'
import { getCachedDebtors } from '@/lib/cached-queries'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import CustomersClient from './CustomersClient'

export default async function CustomersPage() {
  const { supabase, store } = await getServerData()
  const debtors = await getCachedDebtors(store.id)
  const saleRepo = new SaleRepository(supabase)

  // Last 30 days of sales for customer insights
  const now = new Date()
  const monthStart = new Date(now); monthStart.setDate(now.getDate() - 29); monthStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999)
  const recentSales = await saleRepo.findByPeriod(store.id, monthStart, dayEnd)

  // Total sales count (as a proxy for customer activity)
  const totalSalesCount = recentSales.length
  const totalRevenue = recentSales.reduce((s, sale) => s + sale.priceAtSale * sale.qty, 0)

  // Debtors sorted by total owed (most owing first), then alphabetically
  const sortedDebtors = [...debtors].sort((a, b) => b.totalOwed - a.totalOwed)

  return (
    <div className="px-4 pt-6 pb-4">
      <CustomersClient
        debtors={sortedDebtors}
        totalSalesCount={totalSalesCount}
        totalRevenue={totalRevenue}
        debtorCount={debtors.length}
      />
    </div>
  )
}
