-- ============================================================
-- STOKI — Migration 019: Market indicators (Phase 1.5)
-- Replaces the hardcoded baselines in lib/market-context.ts with a real
-- table updated by /api/cron/refresh-market and surfaceable via an admin
-- override UI on /settings/market. Latest row per `kind` wins; we keep
-- history so we can show "rate up 25bps from last month" trends later.
--
-- The data is global (not store-scoped) and non-sensitive — anyone signed
-- in can read; only service role / admin actions write. RLS enforces this
-- so a regular user can't poison the bot with bad data.
-- ============================================================

CREATE TABLE IF NOT EXISTS market_indicators (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Indicator identifier; kept narrow so the bot's prompt stays predictable.
  kind         text NOT NULL CHECK (kind IN (
                  'sarb_repo',         -- SARB policy rate, %
                  'sarb_prime',        -- commercial prime, %
                  'fuel_petrol_95',    -- R / litre, coastal
                  'fuel_diesel',       -- R / litre, wholesale
                  'cpi_yoy',           -- year-on-year inflation, %
                  'usd_zar',           -- exchange rate
                  'eur_zar'            -- exchange rate
               )),
  value        numeric(12,4) NOT NULL,
  source       text NOT NULL,
  -- When the indicator value applies to (e.g. fuel: month start; FX: day).
  measured_at  date,
  fetched_at   timestamptz NOT NULL DEFAULT now(),
  notes        text
);

-- Hot path: "give me the most recent value for each kind". Composite index
-- with DESC fetched_at lets this be a simple LIMIT 1 lookup per kind.
CREATE INDEX IF NOT EXISTS market_indicators_kind_fetched_idx
  ON market_indicators(kind, fetched_at DESC);

ALTER TABLE market_indicators ENABLE ROW LEVEL SECURITY;

-- Anyone signed in can read — these are public market values.
DROP POLICY IF EXISTS "auth_read_market_indicators" ON market_indicators;
CREATE POLICY "auth_read_market_indicators" ON market_indicators
  FOR SELECT TO authenticated USING (true);

-- Writes are service-role only (no policy = no access for regular roles).
-- Both the cron endpoint and the manual-override admin action go through
-- the admin client, which bypasses RLS.
