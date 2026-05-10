import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { authoriseCron } from '@/lib/push-helpers'
import {
  recordPaymentSuccess,
  recordPaymentFailure,
  recordCancellation,
  recordExpiry,
} from '@/lib/subscription'
import type { Plan } from '@/domain/entities/store'

/**
 * Generic billing webhook.
 *
 * Receives normalised events from a payment provider (currently a stub —
 * we accept test payloads while no provider is wired in). Once a provider
 * lands, the adapter for that provider's webhook format lives at the top
 * of this file and emits one of the canonical events below.
 *
 * Event payload (JSON body):
 *   {
 *     "event": "payment.succeeded" | "payment.failed"
 *            | "subscription.cancelled" | "subscription.expired",
 *     "storeId": "uuid",
 *     "plan":    "pro" | "business",         // for payment.succeeded
 *     "periodDays": 30,                       // for payment.succeeded
 *     "provider": "yoco" | "peach" | ...,    // optional
 *     "providerRef": "sub_XXX",               // optional
 *     "reason": "card_declined"              // optional, for payment.failed
 *   }
 *
 * Auth: same bearer/cron mechanism as the push routes. Once a real provider
 * is in place, add HMAC signature verification at the top.
 */

interface WebhookEvent {
  event: string
  storeId?: string
  plan?: Plan
  periodDays?: number
  provider?: string
  providerRef?: string
  reason?: string
}

export async function POST(req: NextRequest) {
  if (!authoriseCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let payload: WebhookEvent
  try {
    payload = await req.json() as WebhookEvent
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!payload.storeId) return NextResponse.json({ error: 'Missing storeId' }, { status: 400 })
  if (!payload.event)   return NextResponse.json({ error: 'Missing event' }, { status: 400 })

  const admin = createAdminClient()

  try {
    switch (payload.event) {
      case 'payment.succeeded':
        if (!payload.plan || !payload.periodDays) {
          return NextResponse.json({ error: 'payment.succeeded needs plan + periodDays' }, { status: 400 })
        }
        await recordPaymentSuccess(admin, {
          storeId: payload.storeId,
          plan: payload.plan,
          periodDays: payload.periodDays,
          provider: payload.provider,
          providerRef: payload.providerRef,
        })
        return NextResponse.json({ ok: true, applied: 'payment.succeeded' })

      case 'payment.failed':
        await recordPaymentFailure(admin, payload.storeId, payload.reason)
        return NextResponse.json({ ok: true, applied: 'payment.failed' })

      case 'subscription.cancelled':
        await recordCancellation(admin, payload.storeId)
        return NextResponse.json({ ok: true, applied: 'subscription.cancelled' })

      case 'subscription.expired':
        // Manual expiry override (admin force-expire, dispute, etc.)
        await recordExpiry(admin, payload.storeId, 'manual')
        return NextResponse.json({ ok: true, applied: 'subscription.expired' })

      default:
        return NextResponse.json({ error: `Unknown event "${payload.event}"` }, { status: 400 })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
