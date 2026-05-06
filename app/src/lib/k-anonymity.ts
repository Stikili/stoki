/**
 * k-anonymity helpers for peer-comparison features.
 *
 * Used by F-A-01 (local price benchmarking), F-A-09 (peer benchmarking),
 * F-A-11 (group buying coordinator). Each of those compares the requesting
 * shop against an anonymised cohort of similar shops; if the cohort is too
 * small, individual shops in it become re-identifiable.
 *
 * Rule: never expose aggregated stats unless the cohort has at least
 * `MIN_COHORT_SIZE` distinct shops. Below threshold, return null so the
 * caller can render a "we'll show you this once we have N nearby shops"
 * graceful-degradation message.
 */

export const MIN_COHORT_SIZE = 10

export interface CohortStat<T> {
  /** Number of shops the aggregate is over. Always >= MIN_COHORT_SIZE. */
  cohortSize: number
  value: T
}

/** Wrap an aggregate so callers can never accidentally render it without
 *  having checked cohort size. Returns null below threshold. */
export function withCohortGuard<T>(cohortSize: number, value: T): CohortStat<T> | null {
  if (cohortSize < MIN_COHORT_SIZE) return null
  return { cohortSize, value }
}

/** Standard "not enough peers" message returned to the AI advisor when a
 *  network-effect feature is queried before density exists. */
export function insufficientCohortMessage(have: number, need: number = MIN_COHORT_SIZE): string {
  const remaining = Math.max(0, need - have)
  return [
    `We don't have enough comparable shops in your area to run this analysis yet`,
    `(we have ${have}, we need ${need} for the comparison to be anonymous`,
    `and meaningful). Check back as more shops in your township join Stoki —`,
    `${remaining > 0 ? `roughly ${remaining} more` : 'almost there'}.`,
  ].join(' ')
}
