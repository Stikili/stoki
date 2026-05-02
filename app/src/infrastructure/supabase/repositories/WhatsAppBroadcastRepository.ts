import { SupabaseClient } from '@supabase/supabase-js'
import { IWhatsAppBroadcastRepository } from '@/domain/repositories/IWhatsAppBroadcastRepository'
import {
  WhatsAppBroadcast,
  NewWhatsAppBroadcast,
  BroadcastRecipient,
  BroadcastRecipientStatus,
} from '@/domain/entities/whatsapp-broadcast'
import { toWhatsAppBroadcast, toBroadcastRecipient } from '../mappers'

export class WhatsAppBroadcastRepository implements IWhatsAppBroadcastRepository {
  constructor(private db: SupabaseClient) {}

  async create(
    storeId: string,
    sentBy: string | null,
    data: NewWhatsAppBroadcast,
    recipients: { customerId: string | null; phone: string }[],
  ): Promise<WhatsAppBroadcast> {
    const { data: header, error: headerErr } = await this.db
      .from('whatsapp_broadcasts')
      .insert({
        store_id: storeId,
        template_name: data.templateName,
        language_code: data.languageCode ?? 'en',
        body_params: data.bodyParams ?? [],
        notes: data.notes ?? null,
        sent_by: sentBy,
        recipient_count: recipients.length,
      })
      .select()
      .single()
    if (headerErr || !header) {
      throw new Error(headerErr?.message ?? 'Failed to create broadcast')
    }

    if (recipients.length > 0) {
      const rows = recipients.map((r) => ({
        broadcast_id: header.id,
        store_id: storeId,
        customer_id: r.customerId,
        phone: r.phone,
      }))
      const { error: recErr } = await this.db.from('whatsapp_broadcast_recipients').insert(rows)
      if (recErr) {
        // Best-effort cleanup so we don't leave a header with missing recipients.
        await this.db.from('whatsapp_broadcasts').delete().eq('id', header.id)
        throw new Error(recErr.message)
      }
    }

    return toWhatsAppBroadcast(header)
  }

  async findRecent(storeId: string, limit = 20): Promise<WhatsAppBroadcast[]> {
    const { data, error } = await this.db
      .from('whatsapp_broadcasts')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw new Error(error.message)
    return (data ?? []).map(toWhatsAppBroadcast)
  }

  async findById(storeId: string, id: string): Promise<WhatsAppBroadcast | null> {
    const { data, error } = await this.db
      .from('whatsapp_broadcasts')
      .select('*')
      .eq('store_id', storeId)
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ? toWhatsAppBroadcast(data) : null
  }

  async findRecipients(storeId: string, broadcastId: string): Promise<BroadcastRecipient[]> {
    const { data, error } = await this.db
      .from('whatsapp_broadcast_recipients')
      .select('*, customers(name)')
      .eq('store_id', storeId)
      .eq('broadcast_id', broadcastId)
      .order('created_at')
    if (error) throw new Error(error.message)
    return (data ?? []).map(toBroadcastRecipient)
  }

  async findPendingRecipients(storeId: string, broadcastId: string): Promise<BroadcastRecipient[]> {
    const { data, error } = await this.db
      .from('whatsapp_broadcast_recipients')
      .select('*, customers(name)')
      .eq('store_id', storeId)
      .eq('broadcast_id', broadcastId)
      .eq('status', 'pending')
      .order('created_at')
    if (error) throw new Error(error.message)
    return (data ?? []).map(toBroadcastRecipient)
  }

  async markRecipientStatus(
    storeId: string,
    recipientId: string,
    status: BroadcastRecipientStatus,
    error?: string,
  ): Promise<void> {
    // Look up the broadcast id so we can bump the right counter.
    const { data: row, error: selErr } = await this.db
      .from('whatsapp_broadcast_recipients')
      .select('broadcast_id, status')
      .eq('store_id', storeId)
      .eq('id', recipientId)
      .single()
    if (selErr || !row) throw new Error(selErr?.message ?? 'Recipient not found')

    // Skip if already in a terminal state — avoids double-incrementing counters.
    if (row.status === 'sent' || row.status === 'failed') return

    const { error: updErr } = await this.db
      .from('whatsapp_broadcast_recipients')
      .update({
        status,
        error: error ?? null,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
      })
      .eq('id', recipientId)
      .eq('store_id', storeId)
    if (updErr) throw new Error(updErr.message)

    // Bump the aggregate counter on the parent broadcast. Read-modify-write
    // is safe enough here because sendBroadcastBatch dispatches recipients
    // sequentially (one update at a time) — and even if it weren't, the
    // recipient table is canonical, the counter is just a UI hint.
    const counterColumn = status === 'sent' ? 'sent_count' : 'failed_count'
    const { data: parent } = await this.db
      .from('whatsapp_broadcasts')
      .select(counterColumn)
      .eq('id', row.broadcast_id)
      .single<Record<string, number>>()
    if (parent) {
      const next = (parent[counterColumn] ?? 0) + 1
      await this.db
        .from('whatsapp_broadcasts')
        .update({ [counterColumn]: next })
        .eq('id', row.broadcast_id)
    }
  }

  async markSent(storeId: string, broadcastId: string): Promise<void> {
    const { error } = await this.db
      .from('whatsapp_broadcasts')
      .update({ sent_at: new Date().toISOString() })
      .eq('store_id', storeId)
      .eq('id', broadcastId)
      .is('sent_at', null) // don't restamp on retries
    if (error) throw new Error(error.message)
  }
}
