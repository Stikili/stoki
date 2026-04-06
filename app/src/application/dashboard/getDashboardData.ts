import { ISaleRepository } from '@/domain/repositories/ISaleRepository'
import { IProductRepository } from '@/domain/repositories/IProductRepository'
import { IAlertRepository } from '@/domain/repositories/IAlertRepository'
import { IDebtorRepository } from '@/domain/repositories/IDebtorRepository'
import { ProductWithStatus, withStatus } from '@/domain/entities/product'
import { SalesSummary } from '@/domain/entities/sale'
import { Alert } from '@/domain/entities/alert'

export interface DashboardData {
  today: SalesSummary
  week: SalesSummary
  lowStockProducts: ProductWithStatus[]
  unreadAlerts: Alert[]
  totalOutstanding: number
}

export async function getDashboardData(
  saleRepo: ISaleRepository,
  productRepo: IProductRepository,
  alertRepo: IAlertRepository,
  debtorRepo: IDebtorRepository,
  storeId: string
): Promise<DashboardData> {
  const now = new Date()
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999)
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0)

  const [today, week, products, unreadAlerts, debtors] = await Promise.all([
    saleRepo.summarise(storeId, dayStart, dayEnd),
    saleRepo.summarise(storeId, weekStart, dayEnd),
    productRepo.findAll(storeId),
    alertRepo.findUnread(storeId),
    debtorRepo.findAll(storeId),
  ])

  const lowStockProducts = products
    .map(withStatus)
    .filter((p) => p.status === 'low' || p.status === 'out')

  const totalOutstanding = debtors.reduce((sum, d) => sum + d.totalOwed, 0)

  return { today, week, lowStockProducts, unreadAlerts, totalOutstanding }
}
