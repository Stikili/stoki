import { Wastage, NewWastage } from '@/domain/entities/wastage'

export interface IWastageRepository {
  record(storeId: string, data: NewWastage & { costAtLoss: number }): Promise<Wastage>
  findByPeriod(storeId: string, from: Date, to: Date): Promise<Wastage[]>
}
