import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Conversation memory for the AI advisor.
 *
 * Keeps the last N user/assistant exchanges per (user, store, channel) so
 * the bot can stitch context across turns. Reads + writes go through the
 * admin client because analytics-style writes need to bypass RLS — we
 * still scope every row to the caller's user_id explicitly.
 *
 * Channel-scoped because in-app and WhatsApp have different tones / lengths
 * and mixing them produces weird carry-over.
 */

export type AdvisorChannel = 'in_app' | 'whatsapp'

export interface StoredMessage {
  role: 'user' | 'assistant'
  content: string
}

/** How many turns to load when seeding context. Each "turn" is user + assistant
 *  so this is ~16 messages. Plenty for a session without burning token budget. */
const MEMORY_TURNS = 8

export async function loadRecentMessages(
  admin: SupabaseClient,
  userId: string,
  storeId: string,
  channel: AdvisorChannel,
): Promise<StoredMessage[]> {
  try {
    const { data } = await admin
      .from('advisor_conversations')
      .select('role, content')
      .eq('user_id', userId)
      .eq('store_id', storeId)
      .eq('channel', channel)
      .order('created_at', { ascending: false })
      .limit(MEMORY_TURNS * 2)
    // We selected newest-first to bound the result set; the model needs
    // oldest-first for the messages array. Reverse before returning.
    return ((data as StoredMessage[] | null) ?? []).reverse()
  } catch {
    // Table missing or query failed — memory is a soft feature, fail open.
    return []
  }
}

/** Persist a single exchange (user message + assistant response). Best-effort. */
export async function appendExchange(
  admin: SupabaseClient,
  userId: string,
  storeId: string,
  channel: AdvisorChannel,
  userMessage: string,
  assistantMessage: string,
): Promise<void> {
  try {
    await admin.from('advisor_conversations').insert([
      { user_id: userId, store_id: storeId, channel, role: 'user',      content: userMessage },
      { user_id: userId, store_id: storeId, channel, role: 'assistant', content: assistantMessage },
    ])
  } catch {
    // Memory is non-critical; never block the response.
  }
}

/** Sweep rows older than 30 days. Wire to a daily cron so the table stays
 *  bounded without a separate retention job. */
export async function pruneOldConversations(admin: SupabaseClient): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const { count } = await admin
    .from('advisor_conversations')
    .delete({ count: 'exact' })
    .lt('created_at', cutoff)
  return count ?? 0
}
