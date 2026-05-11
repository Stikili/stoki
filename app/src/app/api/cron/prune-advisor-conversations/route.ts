import { NextResponse } from 'next/server'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { authoriseCron } from '@/lib/push-helpers'
import { pruneOldConversations } from '@/lib/advisor/conversations'

/**
 * Daily 02:00 UTC sweep of advisor_conversations.
 *
 * Drops rows older than 30 days so the table stays bounded without manual
 * retention. Conversation memory is intentionally short-term — the bot
 * doesn't need to remember what you asked it three months ago.
 *
 * Cron schedule: 0 2 * * * (02:00 UTC = 04:00 SAST, off-peak).
 */
export async function POST(req: Request) {
  if (!authoriseCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const admin = createAdminClient()
  const deleted = await pruneOldConversations(admin)
  return NextResponse.json({ deleted })
}

export async function GET(req: Request) { return POST(req) }
