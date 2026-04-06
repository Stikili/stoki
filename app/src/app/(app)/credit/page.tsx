import { getServerData } from '@/lib/getServerData'
import { getCachedDebtors } from '@/lib/cached-queries'
import { CreditEntryRepository } from '@/infrastructure/supabase/repositories/CreditEntryRepository'
import { CreditEntry } from '@/domain/entities/credit-entry'
import CreditClient from './CreditClient'
import { Debtor } from '@/domain/entities/debtor'

export type DebtorWithEntries = Debtor & { entries: CreditEntry[] }

export default async function CreditPage() {
  const { supabase, store } = await getServerData()
  const creditRepo = new CreditEntryRepository(supabase)

  // Debtors from cache; credit entries always fresh (volatile per-debtor state)
  const debtors = await getCachedDebtors(store.id)

  const debtorsWithEntries: DebtorWithEntries[] = await Promise.all(
    debtors.map(async (d) => ({
      ...d,
      entries: await creditRepo.findByDebtor(store.id, d.id),
    }))
  )

  const totalOutstanding = debtors.reduce((sum, d) => sum + d.totalOwed, 0)

  return (
    <div className="px-4 pt-6 pb-4">
      <CreditClient debtors={debtorsWithEntries} totalOutstanding={totalOutstanding} />
    </div>
  )
}
