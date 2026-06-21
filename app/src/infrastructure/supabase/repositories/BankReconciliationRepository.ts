import { SupabaseClient } from '@supabase/supabase-js'

export type ReconciliationResolution = 'matched' | 'expensed' | 'skipped'

export interface ReconciliationKey {
  statementDate: string
  amount: number
  descriptionFingerprint: string
}

/**
 * Returns a Set of composite fingerprint strings for all previously resolved
 * lines in this store. Each entry is `${statementDate}|${amount}|${descFp}`.
 * The client uses the same format to check parsed lines on upload.
 */
export class BankReconciliationRepository {
  constructor(private db: SupabaseClient) {}

  async findResolvedKeys(storeId: string): Promise<Set<string>> {
    const { data, error } = await this.db
      .from('bank_reconciliations')
      .select('statement_date, amount, description_fingerprint')
      .eq('store_id', storeId)

    if (error) throw new Error(error.message)

    const keys = new Set<string>()
    for (const row of data ?? []) {
      keys.add(compositeKey(row.statement_date, row.amount, row.description_fingerprint))
    }
    return keys
  }

  async upsert(
    storeId: string,
    key: ReconciliationKey,
    resolution: ReconciliationResolution,
  ): Promise<void> {
    const { error } = await this.db
      .from('bank_reconciliations')
      .upsert(
        {
          store_id: storeId,
          statement_date: key.statementDate,
          amount: key.amount,
          description_fingerprint: key.descriptionFingerprint,
          resolution,
          resolved_at: new Date().toISOString(),
        },
        { onConflict: 'store_id,statement_date,amount,description_fingerprint' },
      )

    if (error) throw new Error(error.message)
  }
}

export function compositeKey(
  statementDate: string,
  amount: number,
  descFp: string,
): string {
  return `${statementDate}|${amount}|${descFp}`
}
