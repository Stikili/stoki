import { describe, expect, it, vi } from 'vitest'
import { sendBroadcast, TemplateSender } from './sendBroadcast'
import { WhatsAppBroadcast, BroadcastRecipient, NewWhatsAppBroadcast, BroadcastRecipientStatus } from '@/domain/entities/whatsapp-broadcast'
import { IWhatsAppBroadcastRepository } from '@/domain/repositories/IWhatsAppBroadcastRepository'

class FakeBroadcastRepo implements IWhatsAppBroadcastRepository {
  recipients: BroadcastRecipient[] = []
  broadcasts: WhatsAppBroadcast[] = []
  marked: { id: string; status: BroadcastRecipientStatus; error?: string }[] = []
  sentBroadcasts: string[] = []

  async create(storeId: string, sentBy: string | null, data: NewWhatsAppBroadcast): Promise<WhatsAppBroadcast> {
    const b: WhatsAppBroadcast = {
      id: `b${this.broadcasts.length + 1}`,
      storeId,
      templateName: data.templateName,
      languageCode: data.languageCode ?? 'en',
      bodyParams: data.bodyParams ?? [],
      notes: data.notes ?? null,
      sentBy,
      sentAt: null,
      recipientCount: 0,
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date().toISOString(),
    }
    this.broadcasts.push(b)
    return b
  }
  async findRecent(): Promise<WhatsAppBroadcast[]> { return this.broadcasts }
  async findById(_s: string, id: string): Promise<WhatsAppBroadcast | null> {
    return this.broadcasts.find((b) => b.id === id) ?? null
  }
  async findRecipients(): Promise<BroadcastRecipient[]> { return this.recipients }
  async findPendingRecipients(): Promise<BroadcastRecipient[]> {
    return this.recipients.filter((r) => r.status === 'pending')
  }
  async markRecipientStatus(_s: string, id: string, status: BroadcastRecipientStatus, error?: string): Promise<void> {
    this.marked.push({ id, status, error })
    const r = this.recipients.find((x) => x.id === id)
    if (r) r.status = status
  }
  async markSent(_s: string, id: string): Promise<void> {
    this.sentBroadcasts.push(id)
  }
}

function makeBroadcast(overrides: Partial<WhatsAppBroadcast> = {}): WhatsAppBroadcast {
  return {
    id: 'b1', storeId: 's1', templateName: 'promo', languageCode: 'en',
    bodyParams: ['Hi {{name}}'], notes: null, sentBy: null, sentAt: null,
    recipientCount: 0, sentCount: 0, failedCount: 0,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeRecipient(id: string, name = 'Alice', phone = '27821234567'): BroadcastRecipient {
  return {
    id, broadcastId: 'b1', storeId: 's1',
    customerId: `c-${id}`, customerName: name, phone,
    status: 'pending', error: null, sentAt: null,
    createdAt: '2026-01-01T00:00:00Z',
  }
}

describe('sendBroadcast', () => {
  it('marks every recipient sent on success', async () => {
    const repo = new FakeBroadcastRepo()
    repo.recipients = [makeRecipient('r1'), makeRecipient('r2', 'Bob')]
    const send: TemplateSender = vi.fn(async () => ({ ok: true }))

    const result = await sendBroadcast(repo, send, 's1', makeBroadcast(), { delayMs: 0 })

    expect(result).toEqual({ sent: 2, failed: 0 })
    expect(repo.marked.every((m) => m.status === 'sent')).toBe(true)
  })

  it('records per-recipient failure with error message but keeps going', async () => {
    const repo = new FakeBroadcastRepo()
    repo.recipients = [makeRecipient('r1'), makeRecipient('r2', 'Bob')]
    let calls = 0
    const send: TemplateSender = vi.fn(async () => {
      calls++
      if (calls === 1) throw new Error('Meta API 429: rate limited')
      return { ok: true }
    })

    const result = await sendBroadcast(repo, send, 's1', makeBroadcast(), { delayMs: 0 })

    expect(result).toEqual({ sent: 1, failed: 1 })
    expect(repo.marked[0]).toEqual({ id: 'r1', status: 'failed', error: 'Meta API 429: rate limited' })
    expect(repo.marked[1]).toEqual({ id: 'r2', status: 'sent', error: undefined })
  })

  it('substitutes {{name}} and {{phone}} per recipient', async () => {
    const repo = new FakeBroadcastRepo()
    repo.recipients = [
      makeRecipient('r1', 'Alice', '27821111111'),
      makeRecipient('r2', 'Bob', '27822222222'),
    ]
    const calls: { phone: string; params: string[] }[] = []
    const send: TemplateSender = async (phone, _t, _l, params) => {
      calls.push({ phone, params })
    }

    await sendBroadcast(repo, send, 's1', makeBroadcast({
      bodyParams: ['Hi {{name}}, your number is {{phone}}'],
    }), { delayMs: 0 })

    expect(calls).toEqual([
      { phone: '27821111111', params: ['Hi Alice, your number is 27821111111'] },
      { phone: '27822222222', params: ['Hi Bob, your number is 27822222222'] },
    ])
  })

  it('stamps the broadcast as sent once every recipient is settled', async () => {
    const repo = new FakeBroadcastRepo()
    repo.recipients = [makeRecipient('r1'), makeRecipient('r2')]
    const send: TemplateSender = async () => undefined

    await sendBroadcast(repo, send, 's1', makeBroadcast(), { delayMs: 0 })

    expect(repo.sentBroadcasts).toEqual(['b1'])
  })

  it('does not stamp markSent when there are zero pending recipients', async () => {
    const repo = new FakeBroadcastRepo()
    // Empty list — broadcast already drained
    repo.recipients = []
    const send: TemplateSender = vi.fn(async () => undefined)

    const result = await sendBroadcast(repo, send, 's1', makeBroadcast(), { delayMs: 0 })

    expect(result).toEqual({ sent: 0, failed: 0 })
    expect(repo.sentBroadcasts).toEqual([])
    expect(send).not.toHaveBeenCalled()
  })
})
