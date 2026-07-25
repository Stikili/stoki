'use server'

import { revalidatePath } from 'next/cache'
import { CustomerRepository } from '@/infrastructure/supabase/repositories/CustomerRepository'
import { WhatsAppBroadcastRepository } from '@/infrastructure/supabase/repositories/WhatsAppBroadcastRepository'
import { sendBroadcast } from '@/application/whatsapp/sendBroadcast'
import { sendWhatsAppTemplate, normalizeZAPhone } from '@/lib/whatsapp'
import { getServerData } from '@/lib/getServerData'
import { denyIfCashier } from '@/lib/role-guards'

export interface CreateBroadcastResult {
  ok: boolean
  broadcastId?: string
  sent?: number
  failed?: number
  error?: string
}

/**
 * WhatsApp broadcasts fire a Meta template to N opted-in customers
 * simultaneously — that's a marketing decision and a per-message
 * Meta cost. Cashier-blocked; manager+ only.
 */
export async function createBroadcastAction(input: {
  templateName: string
  languageCode?: string
  bodyParams: string[]
  notes?: string
  customerIds: string[]
}): Promise<CreateBroadcastResult> {
  const { supabase, store, user, role } = await getServerData()
  const denied = denyIfCashier(role, 'send a WhatsApp broadcast')
  if (denied) return denied
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

  const broadcast = await broadcastRepo.create(store.id, user.id, {
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
