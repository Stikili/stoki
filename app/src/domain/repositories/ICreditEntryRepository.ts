import { CreditEntry, NewCreditEntry } from '../entities/credit-entry'

export interface ICreditEntryRepository {
  findByDebtor(storeId: string, debtorId: string): Promise<CreditEntry[]>
  create(storeId: string, data: NewCreditEntry): Promise<CreditEntry>
  settle(storeId: string, entryId: string): Promise<void>
}
