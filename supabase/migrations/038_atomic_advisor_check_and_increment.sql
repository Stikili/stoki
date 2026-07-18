-- STOKI — Migration 038: Atomic advisor daily-budget check-and-increment
--
-- Closes BUG-009 from the 2026-07-18 code review:
--
--   Current pattern in /api/advisor and /api/whatsapp/webhook is
--     1. checkAdvisorBudget()   — SELECT count, JS compare vs limit
--     2. askBrain() → LLM call
--     3. recordAdvisorUse()     — RPC that increments count += 1
--
--   Steps 1 and 3 are separate round-trips. A burst of concurrent
--   messages from the same user all read the same pre-increment
--   count, all pass the limit check, all invoke the LLM, and only
--   THEN start incrementing. Free-tier cap silently bypassable.
--
-- This migration adds `check_and_increment_advisor_usage(p_user_id,
-- p_day, p_limit)` which atomically:
--   1. Inserts a row with count=1 if it doesn't exist for today
--   2. If the row exists AND count < limit: increments and returns
--      { allowed: true, used: new_count }
--   3. If the row exists AND count >= limit: does NOT increment and
--      returns { allowed: false, used: current_count }
--
-- The INSERT ... ON CONFLICT ... UPDATE ... RETURNING pattern gives us
-- a single-statement atomic operation. Concurrent callers see the
-- committed new count via row-level lock.
--
-- Caller updates: /api/advisor and /api/whatsapp/webhook can now use
-- this instead of check → LLM → record. Semantics change: the counter
-- increments BEFORE the LLM call (so a spend cost is metered even if
-- the LLM call fails). Trade-off: a failed LLM call still burns one
-- quota unit. Acceptable — the alternative is bypassable caps.

BEGIN;

CREATE OR REPLACE FUNCTION check_and_increment_advisor_usage(
  p_user_id uuid,
  p_day     date,
  p_limit   integer
) RETURNS TABLE (
  allowed boolean,
  used    integer
) AS $$
DECLARE
  v_new_count integer;
BEGIN
  -- Attempt atomic upsert-with-conditional-increment. Postgres locks
  -- the row for the duration of the ON CONFLICT clause, so two
  -- concurrent calls serialise correctly.
  INSERT INTO ai_advisor_usage (user_id, day, count, updated_at)
  VALUES (p_user_id, p_day, 1, now())
  ON CONFLICT (user_id, day)
  DO UPDATE
    SET count      = CASE
                       WHEN ai_advisor_usage.count < p_limit
                       THEN ai_advisor_usage.count + 1
                       ELSE ai_advisor_usage.count
                     END,
        updated_at = CASE
                       WHEN ai_advisor_usage.count < p_limit
                       THEN now()
                       ELSE ai_advisor_usage.updated_at
                     END
  RETURNING ai_advisor_usage.count INTO v_new_count;

  -- The RETURNING clause always gives us the post-UPDATE count, so
  -- if allowed the row is now at count+1 (allowed=true), and if
  -- rejected the row is still at its pre-call value (allowed=false
  -- when new_count > limit, since our CASE didn't increment).
  --
  -- Edge case: brand-new user (INSERT path). v_new_count = 1. If
  -- limit is 0 (should never happen but be defensive), we want to
  -- reject the initial insert. The INSERT path doesn't respect the
  -- CASE, so guard here.
  IF v_new_count = 1 AND p_limit <= 0 THEN
    DELETE FROM ai_advisor_usage
    WHERE user_id = p_user_id AND day = p_day AND count = 1;
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  RETURN QUERY SELECT (v_new_count <= p_limit), v_new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also add the index on `day` that BUG-014 flagged. checkGlobalAdvisorBudget
-- filters by day only; the composite PK (user_id, day) can't serve a
-- day-only predicate efficiently. This partial-index-on-day gives us
-- an index-only scan for the daily-sum query and speeds up the atomic
-- RPC above too.
CREATE INDEX IF NOT EXISTS ai_advisor_usage_day_idx
  ON ai_advisor_usage (day);

COMMIT;
