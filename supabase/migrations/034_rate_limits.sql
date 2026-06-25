-- STOKI — Migration 034: Rate-limit table + atomic advisor counter
--
-- Two protections for the LLM-cost path. Both backed by Postgres rather
-- than Redis / Upstash to keep the moving-parts count down — we're
-- already on Supabase, no new infrastructure.
--
-- 1) request_rate_limits
--    Generic per-(key, minute-bucket) counter. Used for IP-based throttle
--    on /api/advisor and key cron / auth entry points. Key encodes both
--    the route and the principal (e.g. "advisor:ip:1.2.3.4") so distinct
--    routes don't share counters. Window_start is bucketed to the minute;
--    older rows get pruned by a daily cron (cheap — table stays small).
--
-- 2) increment_advisor_usage(user_id, day) RPC
--    Atomic upsert + return of the new count, closing the read-modify-write
--    race in lib/ai-cost-meter.ts. Without this, a script firing 10 advisor
--    requests in 10ms can blow past the daily limit before the JS counter
--    catches up.

BEGIN;

CREATE TABLE IF NOT EXISTS request_rate_limits (
  key           text NOT NULL,
  window_start  timestamptz NOT NULL,
  count         integer NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key, window_start)
);

CREATE INDEX IF NOT EXISTS request_rate_limits_window_idx
  ON request_rate_limits(window_start);

-- Service-role only — no end-user reads or writes. App talks to this via
-- the admin client from middleware / route handlers.
ALTER TABLE request_rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no_user_access" ON request_rate_limits;
CREATE POLICY "no_user_access" ON request_rate_limits
  FOR ALL USING (false);

-- Atomic counter for the advisor usage meter. Returns the count AFTER
-- incrementing — caller compares against the daily limit and decides.
-- SECURITY DEFINER so it can write through RLS without needing the admin
-- client; the read paths in lib/ai-cost-meter still go through the
-- regular client.
CREATE OR REPLACE FUNCTION increment_advisor_usage(
  p_user_id uuid,
  p_day date
) RETURNS integer AS $$
DECLARE
  new_count integer;
BEGIN
  INSERT INTO ai_advisor_usage (user_id, day, count, updated_at)
  VALUES (p_user_id, p_day, 1, now())
  ON CONFLICT (user_id, day) DO UPDATE
    SET count = ai_advisor_usage.count + 1,
        updated_at = now()
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
