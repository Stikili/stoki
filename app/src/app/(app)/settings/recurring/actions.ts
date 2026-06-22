'use server'

import { revalidatePath } from 'next/cache'
import { invalidateDashboard } from '@/lib/cache-tags'
import { getServerData } from '@/lib/getServerData'
import { RecurringExpenseRepository } from '@/infrastructure/supabase/repositories/RecurringExpenseRepository'
import { nextOccurrence, type RecurringFrequency } from '@/domain/entities/recurring-expense'

export interface NewRuleInput {
  category: string
  description: string
  amount: number
  isCapital: boolean
  frequency: RecurringFrequency
  dayValue: number
}

export async function createRecurringAction(
  input: NewRuleInput,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, store, role } = await getServerData()
  if (role === 'cashier') return { ok: false, error: 'Not allowed.' }
  if (!input.description.trim()) return { ok: false, error: 'Description is required.' }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: 'Amount must be greater than zero.' }
  }
  if (input.frequency === 'monthly' && (input.dayValue < 1 || input.dayValue > 31)) {
    return { ok: false, error: 'Monthly day must be 1–31.' }
  }
  if (input.frequency === 'weekly' && (input.dayValue < 0 || input.dayValue > 6)) {
    return { ok: false, error: 'Weekly day must be 0 (Sun) – 6 (Sat).' }
  }

  const repo = new RecurringExpenseRepository(supabase)
  // Anchor next_due to the next occurrence from "today" so a rule created on
  // the 20th for "day 1" doesn't immediately spawn an expense; it waits for
  // the 1st of next month.
  const next = nextOccurrence(input.frequency, input.dayValue, new Date())
  try {
    await repo.create(store.id, {
      ...input,
      nextDueAt: next.toISOString(),
    })
    revalidatePath('/settings/recurring')
    revalidatePath('/expenses')
    revalidatePath('/cashflow')
    invalidateDashboard(store.id)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create rule.' }
  }
}

export async function toggleRecurringAction(
  id: string,
  active: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, store, role } = await getServerData()
  if (role === 'cashier') return { ok: false, error: 'Not allowed.' }
  const repo = new RecurringExpenseRepository(supabase)
  try {
    await repo.update(store.id, id, { active })
    revalidatePath('/settings/recurring')
    revalidatePath('/cashflow')
    invalidateDashboard(store.id)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed.' }
  }
}

export async function archiveRecurringAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, store, role } = await getServerData()
  if (role === 'cashier') return { ok: false, error: 'Not allowed.' }
  const repo = new RecurringExpenseRepository(supabase)
  try {
    await repo.archive(store.id, id)
    revalidatePath('/settings/recurring')
    revalidatePath('/cashflow')
    invalidateDashboard(store.id)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed.' }
  }
}
