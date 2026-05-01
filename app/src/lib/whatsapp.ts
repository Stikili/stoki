import crypto from 'crypto'

const META_API_VERSION = 'v21.0'
const META_API = `https://graph.facebook.com/${META_API_VERSION}`

export function normalizeZAPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) return '27' + digits.slice(1)
  return digits
}

async function metaPost(path: string, body: unknown) {
  const phoneId = process.env.META_PHONE_NUMBER_ID
  const token = process.env.META_ACCESS_TOKEN
  if (!phoneId || !token) throw new Error('Missing META_PHONE_NUMBER_ID or META_ACCESS_TOKEN')

  const res = await fetch(`${META_API}/${phoneId}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Meta API ${res.status}: ${text}`)
  }
  return res.json()
}

export async function sendWhatsAppText(to: string, body: string) {
  return metaPost('messages', {
    messaging_product: 'whatsapp',
    to: normalizeZAPhone(to),
    type: 'text',
    text: { body, preview_url: false },
  })
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  bodyParams: string[],
) {
  return metaPost('messages', {
    messaging_product: 'whatsapp',
    to: normalizeZAPhone(to),
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(bodyParams.length > 0 && {
        components: [
          {
            type: 'body',
            parameters: bodyParams.map(text => ({ type: 'text', text })),
          },
        ],
      }),
    },
  })
}

// Validates Meta's webhook signature (X-Hub-Signature-256: sha256=<hex>)
export function validateMetaSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.META_APP_SECRET
  if (!secret || !signature) return false
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  // Constant-time comparison to avoid timing attacks
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export interface MetaIncomingMessage {
  from: string
  text: string
  messageId: string
}

// Extracts the first text message from a Meta webhook POST payload.
// Returns null for non-message events (status updates, deliveries, etc.).
export function extractIncomingMessage(payload: unknown): MetaIncomingMessage | null {
  const p = payload as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: Array<{
            from?: string
            id?: string
            type?: string
            text?: { body?: string }
          }>
        }
      }>
    }>
  }
  const msg = p?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
  if (!msg || msg.type !== 'text' || !msg.from || !msg.text?.body || !msg.id) return null
  return { from: msg.from, text: msg.text.body, messageId: msg.id }
}
