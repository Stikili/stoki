-- STOKI — Migration 021: Pricing tiers
--
-- Renames the plan enum from the early-stage ('free', 'starter', 'growth')
-- to the customer-facing ('free', 'pro', 'business', 'enterprise') and adds
-- the grandfathered_until column used by:
--   * existing accounts at migration time → 90-day Pro grandfather window
--     so paywall rollout doesn't yank features users were already using
--   * new account first store at creation → 14-day Pro trial window
--
-- Effective-plan resolution lives in app code (lib/effective-plan.ts): if
-- grandfathered_until > now(), the user is treated as Pro regardless of the
-- stored plan value.

BEGIN;

-- 1) Rename existing plan values before tightening the check constraint.
-- starter → pro, growth → business. Free stays free. Anything else (defensive
-- — shouldn't exist) flips to free.
UPDATE stores SET plan = CASE plan
  WHEN 'starter' THEN 'pro'
  WHEN 'growth'  THEN 'business'
  WHEN 'free'    THEN 'free'
  WHEN 'pro'     THEN 'pro'
  WHEN 'business' THEN 'business'
  WHEN 'enterprise' THEN 'enterprise'
  ELSE 'free'
END;

-- 2) Swap the check constraint. The old one is named implicitly so we look
-- it up by attribute and drop conditionally to stay re-runnable.
ALTER TABLE stores DROP CONSTRAINT IF EXISTS stores_plan_check;
ALTER TABLE stores ADD CONSTRAINT stores_plan_check
  CHECK (plan IN ('free', 'pro', 'business', 'enterprise'));

-- 3) Grandfathering column. NULL = no grandfather (regular paywall applies).
-- Stamped to a future timestamptz for existing accounts during this same
-- migration (90 days) and for new accounts at store-create time (14 days).
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS grandfathered_until timestamptz;

-- 4) Backfill: every existing non-demo store gets 90 days of Pro access.
-- Demo stores skip the grandfather since they're already showcase-only and
-- their owner can poke around paywall states freely without losing real work.
UPDATE stores
  SET grandfathered_until = now() + interval '90 days'
  WHERE grandfathered_until IS NULL
    AND COALESCE(is_demo, false) = false
    AND deleted_at IS NULL;

COMMIT;
