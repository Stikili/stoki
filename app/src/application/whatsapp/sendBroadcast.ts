import { IWhatsAppBroadcastRepository } from '@/domain/repositories/IWhatsAppBroadcastRepository'
import { WhatsAppBroadcast, resolveBodyParams } from '@/domain/entities/whatsapp-broadcast'

/**
 * Adapter for the actual Meta-API send. Injected so tests can swap a fake.
 * Production binds this to `sendWhatsAppTemplate` from `@/lib/whatsapp`.
 */
export type TemplateSender = (
  to: string,
  templateName: string,
  languageCode: string,
  bodyParams: string[],
) => Promise<unknown>

export interface SendBroadcastOptions {
  /** Pause between sends (ms). Meta tolerates ~250 msgs/sec on quality-rated
   *  numbers — we default to 50ms (~20/sec) so a 200-customer broadcast takes
   *  ~10s and we stay well below rate limits. */
  delayMs?: number
}

export interface SendBroadcastResult {
  sent: number
  failed: number
}

/**
 * Dispatch every pending recipient of a broadcast in sequence, respecting a
 * tiny per-message delay so Meta doesn't rate-limit us. Stamps each recipient
 * sent / failed individually — partial failures don't abort the batch.
 *
 * Each recipient gets per-recipient body parameters via {{name}} / {{phone}}
 * substitution from the broadcast's stored params (resolveBodyParams).
 */
export async function sendBroadcast(
  repo: IWhatsAppBroadcastRepository,
  send: TemplateSender,
  storeId: string,
  broadcast: WhatsAppBroadcast,
  options: SendBroadcastOptions = {},
): Promise<SendBroadcastResult> {
  const delayMs = options.delayMs ?? 50
  const recipients = await repo.findPendingRecipients(storeId, broadcast.id)

  let sent = 0
  let failed = 0

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i]
    try {
      const params = resolveBodyParams(broadcast.bodyParams, {
        name: r.customerName ?? '',
        phone: r.phone,
      })
      await send(r.phone, broadcast.templateName, broadcast.languageCode, params)
      await repo.markRecipientStatus(storeId, r.id, 'sent')
      sent++
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      await repo.markRecipientStatus(storeId, r.id, 'failed', message)
      failed++
    }

    if (delayMs > 0 && i < recipients.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  if (sent + failed === recipients.length && recipients.length > 0) {
    await repo.markSent(storeId, broadcast.id)
  }

  return { sent, failed }
}
