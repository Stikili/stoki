'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/infrastructure/supabase/server'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { CustomerRepository } from '@/infrastructure/supabase/repositories/CustomerRepository'
import { WhatsAppBroadcastRepository } from '@/infrastructure/supabase/repositories/WhatsAppBroadcastRepository'
import { sendBroadcast } from '@/application/whatsapp/sendBroadcast'
import { sendWhatsAppTemplate, normalizeZAPhone } from '@/lib/whatsapp'

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const storeRepo = new StoreRepository(supabase)
  const store = await storeRepo.getByOwnerId(user.id)
  if (!store) redirect('/login')
  return { supabase, store, userId: user.id }
}

export interface CreateBroadcastResult {
  ok: boolean
  broadcastId?: string
  sent?: number
  failed?: number
  error?: string
}

export async function createBroadcastAction(input: {
  templateName: string
  languageCode?: string
  bodyParams: string[]
  notes?: string
  customerIds: string[]
}): Promise<CreateBroadcastResult> {
  const { supabase, store, userId } = await getContext()
  const broadcastRepo = new WhatsAppBroadcastRepository(supabase)
  const customerRepo = new CustomerRepository(supabase)

  if (!input.templateName.trim()) {
    return { ok: false, error: 'Template name is required' }
  }

  // Pull only opted-in customers with phone numbers. Defence in depth — the
  // UI also filters but a stale cache or a manually-supplied id list could
  // sneak a non-opted-in id through.
  const allCustomers = await customerRepo.findAll(store.id)
  const validRecipients = allCustomers
    .filter((c) => input.customerIds.includes(c.id))
    .filter((c) => c.marketingOptIn && c.phone)
    .map((c) => ({ customerId: c.id, phone: normalizeZAPhone(c.phone!) }))

  if (validRecipients.length === 0) {
    return { ok: false, error: 'No opted-in customers with phone numbers in this selection' }
  }

  const broadcast = await broadcastRepo.create(store.id, userId, {
    templateName: input.templateName.trim(),
    languageCode: input.languageCode ?? 'en',
    bodyParams: input.bodyParams,
    notes: input.notes,
  }, validRecipients)

  const result = await sendBroadcast(
    broadcastRepo,
    sendWhatsAppTemplate,
    store.id,
    broadcast,
  )

  revalidatePath('/broadcasts')

  return {
    ok: true,
    broadcastId: broadcast.id,
    sent: result.sent,
    failed: result.failed,
  }
}
