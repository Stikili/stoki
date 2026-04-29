import twilio from 'twilio'

let client: ReturnType<typeof twilio> | null = null

export function getTwilioClient() {
  if (!client) {
    const sid = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    if (!sid || !token) throw new Error('Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN')
    client = twilio(sid, token)
  }
  return client
}

export async function sendWhatsApp(to: string, body: string) {
  const from = process.env.TWILIO_WHATSAPP_NUMBER
  if (!from) throw new Error('Missing TWILIO_WHATSAPP_NUMBER')
  return getTwilioClient().messages.create({
    from: `whatsapp:${from}`,
    to: `whatsapp:+${to.replace(/\D/g, '')}`,
    body,
  })
}

export function validateTwilioSignature(url: string, params: Record<string, string>, signature: string): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!token) return false
  return twilio.validateRequest(token, signature, url, params)
}
