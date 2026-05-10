-- STOKI — Migration 022: Subscription state machine + analytics events
--
-- Wires the durable state needed for paid plans. The columns live on the
-- existing `stores` table (current state, indexable, no joins on hot path);
-- a separate `subscription_events` table carries the audit trail AND
-- doubles as our in-product analytics store for the paywall conversion
-- funnel (paywall_viewed, paywall_clicked, paywall_converted, etc.).
--
-- Effective-plan resolution stays where it is — the webhook drives the
-- `stores.plan` column through its lifecycle; the resolver doesn't need
-- to know about subscription state.

BEGIN;

-- ── stores: subscription state columns ─────────────────────────────────────
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS subscription_status text
    DEFAULT 'none'
    CHECK (subscription_status IN (
      'none',         -- never subscribed
      'trialing',     -- in grandfather / trial window (orthogonal to billing)
      'active',       -- paid, current
      'past_due',     -- charge failed, retrying
      'cancelled',    -- user cancelled, still has access until subscription_active_until
      'expired'       -- lapsed (cron expired or retries exhausted)
    )),
  ADD COLUMN IF NOT EXISTS subscription_active_until    timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_provider        text,
  ADD COLUMN IF NOT EXISTS subscription_provider_ref    text,
  ADD COLUMN IF NOT EXISTS subscription_last_charge_at  timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_retry_count     integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS stores_subscription_status_idx
  ON stores(subscription_status)
  WHERE deleted_at IS NULL;

-- ── subscription_events: audit trail + conversion-funnel analytics ────────
CREATE TABLE IF NOT EXISTS subscription_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    -- Billing state machine
    'subscription_created',    -- first successful charge
    'subscription_renewed',    -- recurring charge succeeded
    'subscription_failed',     -- charge failed, will retry
    'subscription_cancelled',  -- user cancelled
    'subscription_expired',    -- lapsed
    'subscription_reactivated',-- expired/cancelled → active again
    -- Conversion funnel
    'paywall_viewed',          -- UpgradePrompt opened
    'paywall_clicked',         -- user clicked the upgrade CTA inside the prompt
    'paywall_dismissed',       -- user closed without upgrading
    'checkout_started',        -- user reached the checkout / mailto link
    'checkout_completed',      -- payment succeeded (mirrors subscription_created for funnel)
    'checkout_failed'          -- payment errored at checkout
  )),
  /** Arbitrary structured payload: { gate, plan, period_days, reason, ... } */
  metadata   jsonb,
  /** When known, the auth user who triggered the event. NULL for server-driven
   *  events (cron-expired, webhook-renewed). */
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_events_store_idx
  ON subscription_events(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS subscription_events_type_idx
  ON subscription_events(event_type, created_at DESC);

ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_subscription_events" ON subscription_events;
CREATE POLICY "members_subscription_events" ON subscription_events
  FOR ALL USING (store_id IN (SELECT my_store_ids()));

COMMIT;
