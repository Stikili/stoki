import { CreditEntry, NewCreditEntry } from '@/domain/entities/credit-entry'
import { ICreditEntryRepository } from '@/domain/repositories/ICreditEntryRepository'
import { IDebtorRepository } from '@/domain/repositories/IDebtorRepository'
import { IAlertRepository } from '@/domain/repositories/IAlertRepository'

export async function recordCredit(
  creditRepo: ICreditEntryRepository,
  debtorRepo: IDebtorRepository,
  alertRepo: IAlertRepository,
  storeId: string,
  data: NewCreditEntry
): Promise<CreditEntry> {
  const entry = await creditRepo.create(storeId, data)
  await debtorRepo.updateOwed(storeId, data.debtorId, data.amount)

  const debtor = await debtorRepo.findById(storeId, data.debtorId)
  if (debtor && debtor.totalOwed > 200) {
    await alertRepo.create(
      storeId,
      'debtor',
      `${debtor.name} owes R${debtor.totalOwed.toFixed(2)}. Consider sending a reminder.`
    )
  }

  return entry
}
