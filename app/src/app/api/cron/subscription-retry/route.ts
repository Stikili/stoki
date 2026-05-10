import { NextResponse } from 'next/server'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { authoriseCron } from '@/lib/push-helpers'
import {
  findStoresNeedingAttention,
  recordExpiry,
  recordPaymentFailure,
} from '@/lib/subscription'

/**
 * Daily subscription retry / expiry sweep.
 *
 * For each `past_due` store:
 *   - If the retry budget isn't exhausted, trigger a fresh charge attempt
 *     with the payment provider. (Today: no provider, so we just bump
 *     retry_count via recordPaymentFailure — simulating the next failure.
 *     When Yoco lands, replace the inner call with `provider.retryCharge`
 *     which emits its own webhook on success / failure.)
 *   - If the retry budget IS exhausted, expire the store. The user's plan
 *     drops to free and they lose paid features at the next request.
 *
 * For each `cancelled` store whose paid-through window has elapsed:
 *   - Expire the store. The user got the period they paid for; now they're
 *     back on free.
 *
 * Cron schedule: 0 8 * * * (08:00 UTC daily).
 */
export async function POST(req: Request) {
  if (!authoriseCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { retried, expiredFromRetries, expiredFromCancellation } =
    await findStoresNeedingAttention(admin)

  // Retry attempts. With no provider wired in, this records another failure
  // tick — effectively a "tried, didn't go through" simulation. Real
  // provider-emitted webhooks will overwrite this state on success.
  for (const storeId of retried) {
    await recordPaymentFailure(admin, storeId, 'retry_cron_no_provider')
  }

  // Expire retries-exhausted stores.
  for (const storeId of expiredFromRetries) {
    await recordExpiry(admin, storeId, 'retries_exhausted')
  }

  // Expire cancellations whose paid-through window has lapsed.
  for (const storeId of expiredFromCancellation) {
    await recordExpiry(admin, storeId, 'cancelled_lapsed')
  }

  return NextResponse.json({
    retried: retried.length,
    expired_from_retries: expiredFromRetries.length,
    expired_from_cancellation: expiredFromCancellation.length,
  })
}

export async function GET(req: Request) { return POST(req) }
