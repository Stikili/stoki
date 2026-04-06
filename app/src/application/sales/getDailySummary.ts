import { SalesSummary } from '@/domain/entities/sale'
import { ISaleRepository } from '@/domain/repositories/ISaleRepository'

export async function getDailySummary(
  repo: ISaleRepository,
  storeId: string,
  date: Date = new Date()
): Promise<SalesSummary> {
  const from = new Date(date)
  from.setHours(0, 0, 0, 0)
  const to = new Date(date)
  to.setHours(23, 59, 59, 999)
  return repo.summarise(storeId, from, to)
}

export async function getWeeklySummary(
  repo: ISaleRepository,
  storeId: string
): Promise<SalesSummary[]> {
  const results: SalesSummary[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    results.push(await getDailySummary(repo, storeId, d))
  }
  return results
}
