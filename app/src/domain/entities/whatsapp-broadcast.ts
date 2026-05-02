export type BroadcastRecipientStatus = 'pending' | 'sent' | 'failed'

export interface BroadcastRecipient {
  id: string
  broadcastId: string
  storeId: string
  customerId: string | null
  customerName: string | null
  phone: string
  status: BroadcastRecipientStatus
  error: string | null
  sentAt: string | null
  createdAt: string
}

export interface WhatsAppBroadcast {
  id: string
  storeId: string
  templateName: string
  languageCode: string
  bodyParams: string[]
  notes: string | null
  sentBy: string | null
  sentAt: string | null
  recipientCount: number
  sentCount: number
  failedCount: number
  createdAt: string
}

export interface NewWhatsAppBroadcast {
  templateName: string
  languageCode?: string
  bodyParams?: string[]
  notes?: string
}

/**
 * Substitute per-recipient variables into a Meta template body parameter list.
 * Supports `{{name}}` and `{{phone}}` placeholders inside any param so a single
 * broadcast definition can address each recipient by name without bespoke
 * parameters per send. Unknown placeholders are left untouched (Meta rejects
 * the message rather than silent corruption).
 */
export function resolveBodyParams(
  params: string[],
  recipient: { name: string; phone: string },
): string[] {
  return params.map((p) =>
    p
      .replaceAll('{{name}}', recipient.name)
      .replaceAll('{{phone}}', recipient.phone),
  )
}
