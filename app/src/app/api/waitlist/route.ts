import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { isPlausibleEmail, isValidWaitlistPlan, type WaitlistPlan } from '@/domain/entities/waitlist-signup'
import { rateLimitByIp } from '@/lib/rate-limit'
import { log } from '@/lib/log'

/**
 * POST /api/waitlist — capture a paid-tier waitlist signup from the
 * public /pricing page. Used while Ozow billing is stashed; when a
 * paid tier goes live we email everyone on the list.
 *
 * Auth: none (anonymous public form). Rate-limited by IP.
 *
 * Body: { email: string, plan: 'pro' | 'business' | 'enterprise', notes?: string }
 *
 * Response codes:
 *   200 — signup captured (returns { ok: true })
 *   200 — already-signed-up (returns { ok: true, alreadyOnList: true }) —
 *         idempotent; UX shows the same "thanks" state
 *   400 — validation error (bad email or plan)
 *   429 — rate limited
 *   500 — DB error
 *
 * The admin client is used to bypass RLS on the anon path — the INSERT
 * policy would allow it either way, but the admin client sidesteps
 * the anon session bootstrap for a snappier response on cold Vercel
 * lambdas.
 */
export async function POST(req: NextRequest) {
  const ipBlock = await rateLimitByIp(req, 'waitlist', 10)
  if (ipBlock) return ipBlock

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { email, plan, notes } = (body ?? {}) as { email?: unknown; plan?: unknown; notes?: unknown }

  if (!isPlausibleEmail(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  }
  if (!isValidWaitlistPlan(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const trimmedEmail = email.trim().toLowerCase()
  const trimmedNotes = typeof notes === 'string' && notes.trim().length > 0
    ? notes.trim().slice(0, 500)
    : null

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('waitlist_signups')
    .insert({
      email: trimmedEmail,
      plan: plan as WaitlistPlan,
      notes: trimmedNotes,
    })

  if (error) {
    // Unique-constraint violation → already on the list. Treat as success
    // (idempotent UX). Postgres 23505 = unique_violation.
    if (error.code === '23505') {
      log.info('waitlist.duplicate', { email: trimmedEmail, plan })
      return NextResponse.json({ ok: true, alreadyOnList: true })
    }
    log.error('waitlist.insert_failed', { error })
    return NextResponse.json({ error: 'Could not save your signup. Try again in a moment.' }, { status: 500 })
  }

  log.info('waitlist.signup', { email: trimmedEmail, plan })
  return NextResponse.json({ ok: true })
}
