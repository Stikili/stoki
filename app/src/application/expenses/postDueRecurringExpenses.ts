import { IExpenseRepository } from '@/domain/repositories/IExpenseRepository'
import { RecurringExpenseRepository } from '@/infrastructure/supabase/repositories/RecurringExpenseRepository'
import { nextOccurrence } from '@/domain/entities/recurring-expense'

/**
 * Spawn expense rows for every recurring rule whose next_due_at <= now, then
 * advance each rule's next_due_at. Safe to call at any time (cron or lazy
 * on /expenses page load) — never double-posts because next_due_at advances
 * after each spawn, and a missed-month catches up one month at a time
 * (loop spawns each occurrence between last_posted and now).
 *
 * Returns the number of expenses created so the caller can toast / log.
 */
export async function postDueRecurringExpenses(
  storeId: string,
  expenseRepo: IExpenseRepository,
  recurringRepo: RecurringExpenseRepository,
  now: Date,
): Promise<{ posted: number }> {
  const due = await recurringRepo.findDue(storeId, now)
  let posted = 0

  for (const rule of due) {
    // A rule may have multiple occurrences fall due between cron firings
    // (machine off for a week, rule reactivated after a pause). Loop until
    // the rule's next due date is back in the future.
    // Safety cap at 12 iterations per rule to avoid an unintended sweep
    // catching up years of missed posts in one go.
    let cursor = new Date(rule.nextDueAt)
    let iterations = 0
    while (cursor.getTime() <= now.getTime() && iterations < 12) {
      await expenseRepo.create(storeId, {
        category: rule.category,
        description: rule.description,
        amount: rule.amount,
        isCapital: rule.isCapital,
        recordedAt: cursor.toISOString(),
      })
      const next = nextOccurrence(rule.frequency, rule.dayValue, cursor)
      await recurringRepo.markPosted(storeId, rule.id, next.toISOString(), now.toISOString())
      cursor = next
      iterations++
      posted++
    }
  }

  return { posted }
}
