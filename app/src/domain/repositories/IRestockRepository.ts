import { Restock, NewRestock } from '@/domain/entities/restock'

export interface IRestockRepository {
  record(storeId: string, data: NewRestock): Promise<Restock>
  findByPeriod(storeId: string, from: Date, to: Date): Promise<Restock[]>
  findByProduct(storeId: string, productId: string, limit?: number): Promise<Restock[]>
}
