import { ICreditEntryRepository } from '@/domain/repositories/ICreditEntryRepository'
import { IDebtorRepository } from '@/domain/repositories/IDebtorRepository'

export async function markPaid(
  creditRepo: ICreditEntryRepository,
  debtorRepo: IDebtorRepository,
  storeId: string,
  entryId: string,
  debtorId: string,
  amount: number
): Promise<void> {
  await creditRepo.settle(storeId, entryId)
  await debtorRepo.updateOwed(storeId, debtorId, -amount)
}
