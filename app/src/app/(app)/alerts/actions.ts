'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerData } from '@/lib/getServerData'
import { AlertRepository } from '@/infrastructure/supabase/repositories/AlertRepository'
import { AlertType } from '@/domain/entities/alert'

export async function markAlertReadAction(alertId: string) {
  const { supabase, store } = await getServerData()
  const alertRepo = new AlertRepository(supabase)
  await alertRepo.markRead(store.id, alertId)
  revalidatePath('/alerts')
  revalidatePath('/dashboard')
}

export async function markAllReadAction() {
  const { supabase, store } = await getServerData()
  const alertRepo = new AlertRepository(supabase)
  await alertRepo.markAllRead(store.id)
  revalidatePath('/alerts')
  revalidatePath('/dashboard')
}

export async function createAlertAction(formData: FormData) {
  const { supabase, store } = await getServerData()
  const message = (formData.get('message') as string).trim()
  const type = (formData.get('type') as AlertType) ?? 'debtor'
  if (!message) return
  const alertRepo = new AlertRepository(supabase)
  await alertRepo.create(store.id, type, message)
  revalidatePath('/alerts')
  revalidatePath('/dashboard')
}
