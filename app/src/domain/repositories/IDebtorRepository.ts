import { Debtor, NewDebtor } from '../entities/debtor'

export interface IDebtorRepository {
  findAll(storeId: string): Promise<Debtor[]>
  findById(storeId: string, debtorId: string): Promise<Debtor | null>
  create(storeId: string, data: NewDebtor): Promise<Debtor>
  updateOwed(storeId: string, debtorId: string, delta: number): Promise<void>
  markReminded(storeId: string, debtorId: string): Promise<void>
  archive(storeId: string, debtorId: string): Promise<void>
}
