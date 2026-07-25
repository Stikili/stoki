'use server'

import { revalidatePath } from 'next/cache'
import { invalidateDashboard } from '@/lib/cache-tags'
import { getServerData } from '@/lib/getServerData'
import { AlertRepository } from '@/infrastructure/supabase/repositories/AlertRepository'
import { AlertType } from '@/domain/entities/alert'
import { assertNotCashier } from '@/lib/role-guards'

/**
 * Reading + marking alerts is available to every role — cashiers glance
 * at "3 unread" and clear the noise. Creating alerts by hand is a
 * manager+ concern (bots + the app itself write most alerts server-side;
 * manual creation exists mostly for /admin ad-hoc use).
 */
export async function markAlertReadAction(alertId: string) {
  const { supabase, store } = await getServerData()
  const alertRepo = new AlertRepository(supabase)
  await alertRepo.markRead(store.id, alertId)
  revalidatePath('/alerts')
  revalidatePath('/dashboard')
  invalidateDashboard(store.id)
}

export async function markAllReadAction() {
  const { supabase, store } = await getServerData()
  const alertRepo = new AlertRepository(supabase)
  await alertRepo.markAllRead(store.id)
  revalidatePath('/alerts')
  revalidatePath('/dashboard')
  invalidateDashboard(store.id)
}

export async function createAlertAction(formData: FormData) {
  const { supabase, store, role } = await getServerData()
  assertNotCashier(role, 'create a manual alert')
  const message = (formData.get('message') as string).trim()
  const type = (formData.get('type') as AlertType) ?? 'debtor'
  if (!message) return
  const alertRepo = new AlertRepository(supabase)
  await alertRepo.create(store.id, type, message)
  revalidatePath('/alerts')
  revalidatePath('/dashboard')
  invalidateDashboard(store.id)
}
